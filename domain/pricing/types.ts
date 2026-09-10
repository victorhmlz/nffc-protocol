/**
 * Provider-agnostic price shape. Every price the domain consumes carries its
 * source and observation time — no bare numbers (`docs/spec/03-architecture.md`
 * §6, TASK-22). The Price Engine implementation is TASK-22.
 */
import type { Brand, UnixSeconds } from "@domain/shared/branded";
import type { RepresentationId } from "@domain/registry/types";

/** e.g. `"chainlink:0xabc…"`. */
export type PriceSource = Brand<string, "PriceSource">;

export interface NormalizedPrice {
  readonly representationId: RepresentationId;
  /** Raw integer value as read from the oracle, before scaling. */
  readonly raw: bigint;
  /** `raw` scaled by `priceDecimals` and the representation's multiplier. */
  readonly normalized: number;
  readonly priceDecimals: number;
  /** Oracle `updatedAt`. */
  readonly observedAt: UnixSeconds;
  readonly source: PriceSource;
  readonly multiplier: number;
  /** `true` when `now - observedAt` exceeds the feed heartbeat (+ grace). */
  readonly stale: boolean;
}
