import "server-only";

/**
 * `IndexerStore` (`domain/ports/indexer-store.ts`) over the mirror tables
 * (`db/migrations/0003_indexer_mirror.sql`, `docs/spec/09-data-model.md`).
 * Thin glue over `infra/db`'s pool — untested directly, the same boundary
 * `infra/db/pool.ts` itself already accepts (`docs/conventions.md` §4). All
 * the actual indexing logic (decode, plan, idempotency, resumption) is in
 * `domain/indexer/` and `workers/indexer/run.ts`, fully unit-tested against
 * `tests/support/fakes.ts`'s `createInMemoryIndexerStore` — this file only
 * has to translate a `MirrorWrite`/`ActivityEntry` into the right SQL.
 */
import type { ActivityEntry } from "@domain/nffc-detail/detail";
import type { MirrorWrite } from "@domain/indexer/plan";
import type { IndexerStore } from "@domain/ports/indexer-store";
import { query, withTransaction } from "@infra/db/pool";

function toBytea(hex: string): Buffer {
  return Buffer.from(hex.replace(/^0x/, ""), "hex");
}

/** `ActivityEntry.id` is `${txHash}-${logIndex}` (`domain/indexer/plan.ts`) —
 *  split back into the two real columns the `activity` table's own unique
 *  constraint is on. */
function splitActivityId(id: string): { txHash: string; logIndex: number } {
  const lastDash = id.lastIndexOf("-");
  return { txHash: id.slice(0, lastDash), logIndex: Number(id.slice(lastDash + 1)) };
}

export function createPostgresIndexerStore(): IndexerStore {
  return {
    async getCursor(stream) {
      const result = await query<{ last_block: string }>(
        `SELECT last_block FROM sync_cursor WHERE stream = $1`,
        [stream],
      );
      return result.rows[0] ? Number(result.rows[0].last_block) : null;
    },

    async advanceCursor(stream, lastBlock, status) {
      await query(
        `INSERT INTO sync_cursor (stream, last_block, last_run_at, status)
         VALUES ($1, $2, now(), $3)
         ON CONFLICT (stream) DO UPDATE SET last_block = $2, last_run_at = now(), status = $3`,
        [stream, lastBlock, status],
      );
    },

    async recordActivity(entry: ActivityEntry): Promise<boolean> {
      const { txHash, logIndex } = splitActivityId(entry.id);
      const result = await query(
        `INSERT INTO activity
           (kind, token_id, actor_address, counterparty_address, amount, block_number, log_index, tx_hash)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (tx_hash, log_index) DO NOTHING
         RETURNING id`,
        [
          entry.kind,
          entry.tokenId,
          toBytea(entry.actorAddress),
          entry.counterpartyAddress ? toBytea(entry.counterpartyAddress) : null,
          entry.amountWei,
          entry.blockNumber,
          logIndex,
          toBytea(txHash),
        ],
      );
      return result.rows.length > 0;
    },

    async applyMirrorWrite(write: MirrorWrite): Promise<void> {
      switch (write.kind) {
        case "NFFC_MINT":
          await query(
            `INSERT INTO nffc
               (token_id, collection_id, creator_address, owner_address, composition_hash,
                component_count, minted_at, minted_block, last_synced_block)
             VALUES ($1, $2, $3, $3, $4, $5, to_timestamp($6), $7, $7)
             ON CONFLICT (token_id) DO NOTHING`,
            [
              write.tokenId.toString(),
              write.collectionId.toString(),
              toBytea(write.creatorAddress),
              toBytea(write.compositionHash),
              write.componentCount,
              write.mintedAt,
              write.mintedAtBlock,
            ],
          );
          return;

        case "NFFC_COMPONENTS":
          await withTransaction(async (client) => {
            await client.query(`DELETE FROM nffc_component WHERE token_id = $1`, [write.tokenId.toString()]);
            for (const [position, c] of write.components.entries()) {
              await client.query(
                `INSERT INTO nffc_component (token_id, position, asset_id, representation_id, weight_bps)
                 VALUES ($1, $2, $3, $4, $5)`,
                [write.tokenId.toString(), position, toBytea(c.assetId), toBytea(c.representationId), c.weightBps],
              );
            }
          });
          return;

        case "OWNER_CHANGED":
          await query(
            `UPDATE nffc SET owner_address = $2, last_synced_block = $3
             WHERE token_id = $1 AND last_synced_block <= $3`,
            [write.tokenId.toString(), toBytea(write.ownerAddress), write.atBlock],
          );
          return;

        case "LISTING_OPENED":
          await query(
            `INSERT INTO listing (token_id, seller_address, price, active, created_block)
             VALUES ($1, $2, $3, true, $4)
             ON CONFLICT (token_id) DO UPDATE SET
               seller_address = $2, price = $3, active = true, created_block = $4,
               cancelled_block = NULL, sold_block = NULL`,
            [write.tokenId.toString(), toBytea(write.sellerAddress), write.priceWei, write.atBlock],
          );
          return;

        case "LISTING_CLOSED":
          await query(
            `UPDATE listing SET active = false, ${write.reason === "CANCELLED" ? "cancelled_block" : "sold_block"} = $2
             WHERE token_id = $1 AND active = true`,
            [write.tokenId.toString(), write.atBlock],
          );
          return;

        case "OFFER_OPENED":
          await query(
            `INSERT INTO offer (offer_id, token_id, buyer_address, price, expiry, status, created_block)
             VALUES ($1, $2, $3, $4, to_timestamp($5), 'ACTIVE', $6)
             ON CONFLICT (offer_id) DO NOTHING`,
            [
              write.offerId.toString(),
              write.tokenId.toString(),
              toBytea(write.buyerAddress),
              write.priceWei,
              write.expiry,
              write.atBlock,
            ],
          );
          return;

        case "OFFER_CLOSED":
          await query(`UPDATE offer SET status = $2 WHERE offer_id = $1 AND status = 'ACTIVE'`, [
            write.offerId.toString(),
            write.status,
          ]);
          return;
      }
    },
  };
}
