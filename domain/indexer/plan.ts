/**
 * `IndexedEvent` → the writes it implies: at most one `ActivityEntry`
 * (`domain/nffc-detail/detail.ts`, TASK-21's type, reused rather than
 * duplicated — extended with `tokenId` in this TASK, since TASK-21's
 * single-token detail page never needed one but this indexer's global
 * `activity` table does) plus at most one `MirrorWrite` — a state-table
 * upsert instruction, not the SQL itself (`infra/indexer/`'s job). Pure: no
 * I/O, deterministic given the event and its log context.
 *
 * `ActivityEntry.id` is `${txHash}-${logIndex}` — the same idempotency key
 * `docs/spec/09-data-model.md` names for the `activity` table's own unique
 * constraint, computed here too so the domain layer's notion of "this
 * event's identity" and the database's match exactly.
 *
 * `activity` is `null` for a log that exists purely to populate a mirror
 * table without implying a distinct user-facing activity of its own — see
 * the `NFFC_COMPOSITION_RECORDED` and zero-address `TRANSFER` cases below.
 * Their `MirrorWrite`s are safe to apply unconditionally (no "have I seen
 * this log before" gate): both are full replace-by-key upserts, idempotent
 * on their own merits regardless of how many times they run.
 */
import type { ActivityEntry, ActivityKind } from "@domain/nffc-detail/detail";
import type { UnixSeconds } from "@domain/shared/branded";
import type { IndexedEvent, NffcCompositionComponent } from "@domain/indexer/events";

export interface EventContext {
  readonly blockNumber: number;
  readonly logIndex: number;
  readonly txHash: string;
  readonly blockTimestamp: UnixSeconds;
  /** The transaction's sender — the only actor some events name at all
   *  (e.g. `OfferCancelled`, whose own args carry just an `offerId`). */
  readonly transactionSender: string;
}

export type MirrorWrite =
  | {
      readonly kind: "NFFC_MINT";
      readonly tokenId: bigint;
      readonly collectionId: bigint;
      readonly creatorAddress: string;
      readonly compositionHash: string;
      readonly componentCount: number;
      readonly mintedAtBlock: number;
      readonly mintedAt: UnixSeconds;
    }
  | {
      readonly kind: "NFFC_COMPONENTS";
      readonly tokenId: bigint;
      readonly components: readonly NffcCompositionComponent[];
    }
  | { readonly kind: "OWNER_CHANGED"; readonly tokenId: bigint; readonly ownerAddress: string; readonly atBlock: number }
  | {
      readonly kind: "LISTING_OPENED";
      readonly tokenId: bigint;
      readonly sellerAddress: string;
      readonly priceWei: string;
      readonly atBlock: number;
    }
  | {
      readonly kind: "LISTING_CLOSED";
      readonly tokenId: bigint;
      readonly reason: "CANCELLED" | "SOLD";
      readonly atBlock: number;
    }
  | {
      readonly kind: "OFFER_OPENED";
      readonly offerId: bigint;
      readonly tokenId: bigint;
      readonly buyerAddress: string;
      readonly priceWei: string;
      readonly expiry: UnixSeconds;
      readonly atBlock: number;
    }
  | {
      readonly kind: "OFFER_CLOSED";
      readonly offerId: bigint;
      readonly status: "CANCELLED" | "ACCEPTED";
      readonly atBlock: number;
    };

export interface PlannedWrite {
  readonly activity: ActivityEntry | null;
  readonly mirror: MirrorWrite | null;
}

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

function activityId(ctx: EventContext): string {
  return `${ctx.txHash}-${ctx.logIndex}`;
}

function baseActivity(
  kind: ActivityKind,
  tokenId: bigint | null,
  actorAddress: string,
  counterpartyAddress: string | null,
  amountWei: string | null,
  ctx: EventContext,
): ActivityEntry {
  return {
    id: activityId(ctx),
    kind,
    tokenId: tokenId === null ? null : tokenId.toString(),
    actorAddress,
    counterpartyAddress,
    amountWei,
    blockNumber: ctx.blockNumber,
    txHash: ctx.txHash,
    occurredAt: new Date(ctx.blockTimestamp * 1000).toISOString(),
  };
}

export function planWrite(event: IndexedEvent, ctx: EventContext): PlannedWrite {
  switch (event.kind) {
    case "NFFC_MINTED":
      return {
        activity: baseActivity("MINT", event.tokenId, event.creator, null, null, ctx),
        mirror: {
          kind: "NFFC_MINT",
          tokenId: event.tokenId,
          collectionId: event.collectionId,
          creatorAddress: event.creator,
          compositionHash: event.compositionHash,
          componentCount: event.componentCount,
          mintedAtBlock: ctx.blockNumber,
          mintedAt: ctx.blockTimestamp,
        },
      };

    case "NFFC_COMPOSITION_RECORDED":
      // Same transaction as NFFC_MINTED, a different log — no activity
      // entry of its own (the MINT entry already covers "this token came to
      // exist"); this log exists purely to populate `nffc_component`.
      return {
        activity: null,
        mirror: { kind: "NFFC_COMPONENTS", tokenId: event.tokenId, components: event.components },
      };

    case "TRANSFER": {
      if (event.from.toLowerCase() === ZERO_ADDRESS) {
        // The mint's own internal transfer (`_safeMint`) — again the same
        // transaction as NFFC_MINTED, which already set the owner from
        // `creator`; no separate activity entry, no separate mirror write.
        return { activity: null, mirror: null };
      }
      return {
        activity: baseActivity("TRANSFER", event.tokenId, event.from, event.to, null, ctx),
        mirror: { kind: "OWNER_CHANGED", tokenId: event.tokenId, ownerAddress: event.to, atBlock: ctx.blockNumber },
      };
    }

    case "LISTING_CREATED":
      return {
        activity: baseActivity("LISTING_CREATED", event.tokenId, event.seller, null, event.priceWei.toString(), ctx),
        mirror: {
          kind: "LISTING_OPENED",
          tokenId: event.tokenId,
          sellerAddress: event.seller,
          priceWei: event.priceWei.toString(),
          atBlock: ctx.blockNumber,
        },
      };

    case "LISTING_CANCELLED":
      return {
        activity: baseActivity("LISTING_CANCELLED", event.tokenId, event.seller, null, null, ctx),
        mirror: { kind: "LISTING_CLOSED", tokenId: event.tokenId, reason: "CANCELLED", atBlock: ctx.blockNumber },
      };

    case "SALE":
      // Ownership moves via its own TRANSFER log in the same transaction —
      // this write only closes the listing (idempotent even if a preceding
      // LISTING_CANCELLED in the same tx already closed it — see
      // docs/indexer.md's note on the acceptOffer() edge case).
      return {
        activity: baseActivity("SALE", event.tokenId, event.seller, event.buyer, event.priceWei.toString(), ctx),
        mirror: { kind: "LISTING_CLOSED", tokenId: event.tokenId, reason: "SOLD", atBlock: ctx.blockNumber },
      };

    case "OFFER_CREATED":
      return {
        activity: baseActivity("OFFER_CREATED", event.tokenId, event.buyer, null, event.priceWei.toString(), ctx),
        mirror: {
          kind: "OFFER_OPENED",
          offerId: event.offerId,
          tokenId: event.tokenId,
          buyerAddress: event.buyer,
          priceWei: event.priceWei.toString(),
          expiry: Number(event.expiry) as UnixSeconds,
          atBlock: ctx.blockNumber,
        },
      };

    case "OFFER_CANCELLED":
      // OfferCancelled(offerId) names neither the buyer nor the token — the
      // transaction sender (the only party Marketplace.sol lets call
      // cancelOffer) is the best available actor; tokenId stays unknown
      // here (see docs/indexer.md KNOWN ISSUES — it's still recorded on the
      // `offer` mirror row itself, just not duplicated onto this activity row).
      return {
        activity: baseActivity("OFFER_CANCELLED", null, ctx.transactionSender, null, null, ctx),
        mirror: { kind: "OFFER_CLOSED", offerId: event.offerId, status: "CANCELLED", atBlock: ctx.blockNumber },
      };

    case "OFFER_ACCEPTED":
      return {
        activity: baseActivity(
          "OFFER_ACCEPTED",
          event.tokenId,
          event.seller,
          event.buyer,
          event.priceWei.toString(),
          ctx,
        ),
        mirror: { kind: "OFFER_CLOSED", offerId: event.offerId, status: "ACCEPTED", atBlock: ctx.blockNumber },
      };
  }
}
