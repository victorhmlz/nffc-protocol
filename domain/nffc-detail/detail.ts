/**
 * NFFC detail contract (TASK-21) — everything `/nffc/[tokenId]` needs, beyond
 * what `domain/metadata/metadata.ts` (TASK-11, the static/dynamic split) and
 * `domain/marketplace/listings.ts` (TASK-20, the marketplace mirror) already
 * fix: the collection/creator/owner facts, the current listing, active
 * offers, and the activity timeline — mirroring
 * `docs/spec/09-data-model.md`'s `nffc` / `listing` / `offer` / `activity`
 * tables.
 *
 * `NffcDetail.metadata` **is** the same `StaticNffcMetadata` document
 * `mint` pins to `staticMetadataURI` (TASK-11) — the strongest possible
 * traceability story for the page's static facts (art, composition, segment,
 * static rarity, mint-condition trait): what the page shows and what's
 * independently verifiable via `verifyStaticMetadataAgainstChain` are, by
 * construction, the exact same object.
 *
 * Like `IndexedNffcSummary` (TASK-20), this is the indexer's (TASK-24) exact
 * eventual per-token read shape — `src/lib/nffc-detail/get-nffc-detail.ts` is
 * the one injection point standing in for it until then.
 */
import type { StaticNffcMetadata } from "@domain/metadata/metadata";
import type { IndexedListing } from "@domain/marketplace/listings";

export type ActivityKind =
  | "MINT"
  | "TRANSFER"
  | "LISTING_CREATED"
  | "LISTING_CANCELLED"
  | "SALE"
  | "OFFER_CREATED"
  | "OFFER_ACCEPTED"
  | "OFFER_CANCELLED";

/** One row of `docs/spec/09-data-model.md`'s `activity` table. */
export interface ActivityEntry {
  readonly id: string;
  readonly kind: ActivityKind;
  /** `null` for non-token events — none exist yet (every current
   *  `ActivityKind` is token-scoped), kept nullable to match the spec's own
   *  "nullable for non-token events" column, added in TASK-24 (the indexer,
   *  which writes one global table across every token and genuinely needs
   *  this — TASK-21's original per-token detail page didn't). */
  readonly tokenId: string | null;
  readonly actorAddress: string;
  readonly counterpartyAddress: string | null;
  /** Wei, as a decimal string; `null` for non-value events (e.g. `TRANSFER`). */
  readonly amountWei: string | null;
  readonly blockNumber: number;
  /** 0x-prefixed transaction hash — the on-chain origin this entry traces to. */
  readonly txHash: string;
  readonly occurredAt: string; // ISO 8601
}

/**
 * A read-only view of one active offer (`docs/spec/09-data-model.md`'s
 * `offer` table). Creating/accepting/cancelling an offer is TASK-29's
 * surface, not this page's — see `docs/nffc-detail.md`.
 */
export interface OfferSummary {
  readonly offerId: string;
  readonly buyerAddress: string;
  readonly priceWei: string;
  readonly expiry: string; // ISO 8601 — informational; the contract is authoritative
  readonly active: boolean;
}

export interface NffcDetail {
  /** The exact pinned static-metadata document (TASK-11). */
  readonly metadata: StaticNffcMetadata;
  readonly staticMetadataURI: string;
  readonly collectionName: string;
  readonly creatorAddress: string;
  /** Indexed "fast path" owner — `docs/spec/09-data-model.md` §4: confirmed
   *  against chain before any owner-gated action, never trusted alone for one. */
  readonly ownerAddress: string;
  readonly ownerLastSyncedBlock: number;
  readonly mintedAt: string; // ISO 8601
  readonly listing: IndexedListing | null;
  readonly offers: readonly OfferSummary[];
  /** Newest first. */
  readonly activity: readonly ActivityEntry[];
}
