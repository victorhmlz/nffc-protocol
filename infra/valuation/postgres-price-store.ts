import "server-only";

/**
 * `PriceStore` (`domain/ports/price-store.ts`) over the `price_point` table
 * (`db/migrations/0002_price_nav.sql`, `docs/spec/09-data-model.md`). Thin
 * glue over `infra/db`'s pool — untested directly, like `infra/db/pool.ts`
 * itself (`docs/conventions.md` §4: no test touches a real database). The
 * orchestration that calls this (`workers/nav-materializer/materialize.ts`)
 * is fully unit-tested against an in-memory fake implementing the same port.
 */
import type { RepresentationId } from "@domain/registry/types";
import type { UnixSeconds } from "@domain/shared/branded";
import type { NormalizedPrice, PriceSource } from "@domain/pricing/types";
import type { PriceStore } from "@domain/ports/price-store";
import { query } from "@infra/db/pool";

function toBytea(hex: string): Buffer {
  return Buffer.from(hex.replace(/^0x/, ""), "hex");
}

function fromBytea(buf: Buffer): string {
  return `0x${buf.toString("hex")}`;
}

interface PricePointRow {
  readonly representation_id: Buffer;
  readonly raw_price: string;
  readonly normalized_price: string;
  readonly price_decimals: number;
  readonly source: string;
  readonly observed_at: Date;
  readonly is_stale: boolean;
}

/** `multiplier` isn't its own column (`docs/spec/09-data-model.md`'s
 *  `price_point` doesn't have one — it's a representation-config fact, not a
 *  market observation) but it's exactly reproducible from the three columns
 *  that are: `normalized = (raw / 10^decimals) * multiplier`. */
function deriveMultiplier(row: PricePointRow): number {
  const raw = Number(row.raw_price);
  if (raw === 0) return 0; // no ratio to reconstruct from a zero raw price
  return Number(row.normalized_price) / (raw / 10 ** row.price_decimals);
}

function rowToPrice(row: PricePointRow): NormalizedPrice {
  return {
    representationId: fromBytea(row.representation_id) as RepresentationId,
    raw: BigInt(row.raw_price),
    normalized: Number(row.normalized_price),
    priceDecimals: row.price_decimals,
    observedAt: Math.floor(row.observed_at.getTime() / 1000) as UnixSeconds,
    source: row.source as PriceSource,
    multiplier: deriveMultiplier(row),
    stale: row.is_stale,
  };
}

export function createPostgresPriceStore(): PriceStore {
  return {
    async record(price) {
      await query(
        `INSERT INTO price_point
           (representation_id, raw_price, normalized_price, price_decimals, source, observed_at, is_stale)
         VALUES ($1, $2, $3, $4, $5, to_timestamp($6), $7)
         ON CONFLICT (representation_id, observed_at, source) DO NOTHING`,
        [
          toBytea(price.representationId),
          price.raw.toString(),
          price.normalized,
          price.priceDecimals,
          price.source,
          price.observedAt,
          price.stale,
        ],
      );
    },

    async getLatest(representationId) {
      const result = await query<PricePointRow>(
        `SELECT representation_id, raw_price, normalized_price, price_decimals, source, observed_at, is_stale
         FROM price_point
         WHERE representation_id = $1
         ORDER BY observed_at DESC
         LIMIT 1`,
        [toBytea(representationId)],
      );
      const row = result.rows[0];
      return row ? rowToPrice(row) : null;
    },

    async getHistory(representationId, sinceUnixSeconds) {
      const result = await query<PricePointRow>(
        `SELECT representation_id, raw_price, normalized_price, price_decimals, source, observed_at, is_stale
         FROM price_point
         WHERE representation_id = $1 AND observed_at >= to_timestamp($2)
         ORDER BY observed_at ASC`,
        [toBytea(representationId), sinceUnixSeconds],
      );
      return result.rows.map(rowToPrice);
    },
  };
}
