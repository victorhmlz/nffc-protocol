/**
 * The typed on-chain events the indexer (TASK-24) understands — one variant
 * per event named in `NFFC_Development_Plan.md` v3.2 TASK-24's own list
 * (Transfer, Mint, ListingCreated, ListingCancelled, Sale, OfferCreated,
 * OfferAccepted), plus two additive ones a correct mirror needs even though
 * the plan's list doesn't name them (`docs/reports/TASK-24-REPORT.md`
 * SCOPE NOTE explains why):
 *
 * - `NFFCCompositionRecorded` — without it, `nffc_component` (the table that
 *   makes a minted NFFC's composition indexed at all) would never be
 *   populated; `NFFCMinted` alone carries no per-component detail.
 * - `OfferCancelled` — without it, a cancelled offer's indexed `status`
 *   would incorrectly read `ACTIVE` forever; this isn't an *incomplete*
 *   mirror, it's a *wrong* one.
 *
 * `decodeEvent` (`domain/indexer/decode.ts`) turns a `LogEvent`
 * (`domain/ports/event-source.ts`) into one of these; everything downstream
 * (`plan.ts`, the orchestrator) works only with these typed shapes, never
 * raw `args`.
 */
export interface NffcMintedEvent {
  readonly kind: "NFFC_MINTED";
  readonly tokenId: bigint;
  readonly collectionId: bigint;
  readonly creator: string;
  readonly compositionHash: string;
  readonly componentCount: number;
}

export interface NffcCompositionComponent {
  readonly assetId: string;
  readonly representationId: string;
  readonly weightBps: number;
}

export interface NffcCompositionRecordedEvent {
  readonly kind: "NFFC_COMPOSITION_RECORDED";
  readonly tokenId: bigint;
  readonly components: readonly NffcCompositionComponent[];
}

export interface TransferEvent {
  readonly kind: "TRANSFER";
  readonly tokenId: bigint;
  readonly from: string;
  readonly to: string;
}

export interface ListingCreatedEvent {
  readonly kind: "LISTING_CREATED";
  readonly tokenId: bigint;
  readonly seller: string;
  readonly priceWei: bigint;
}

export interface ListingCancelledEvent {
  readonly kind: "LISTING_CANCELLED";
  readonly tokenId: bigint;
  readonly seller: string;
}

export interface SaleEvent {
  readonly kind: "SALE";
  readonly tokenId: bigint;
  readonly seller: string;
  readonly buyer: string;
  readonly priceWei: bigint;
  readonly feePaidWei: bigint;
  readonly royaltyPaidWei: bigint;
}

export interface OfferCreatedEvent {
  readonly kind: "OFFER_CREATED";
  readonly offerId: bigint;
  readonly tokenId: bigint;
  readonly buyer: string;
  readonly priceWei: bigint;
  readonly expiry: bigint;
}

export interface OfferCancelledEvent {
  readonly kind: "OFFER_CANCELLED";
  readonly offerId: bigint;
}

export interface OfferAcceptedEvent {
  readonly kind: "OFFER_ACCEPTED";
  readonly offerId: bigint;
  readonly tokenId: bigint;
  readonly seller: string;
  readonly buyer: string;
  readonly priceWei: bigint;
}

export type IndexedEvent =
  | NffcMintedEvent
  | NffcCompositionRecordedEvent
  | TransferEvent
  | ListingCreatedEvent
  | ListingCancelledEvent
  | SaleEvent
  | OfferCreatedEvent
  | OfferCancelledEvent
  | OfferAcceptedEvent;
