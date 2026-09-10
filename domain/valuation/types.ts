/**
 * Reference NAV = Σ(weightᵢ × normalizedPriceᵢ). Always labelled "Reference
 * NAV", never bare "value" (`docs/spec/07-ux-map.md` §6, TASK-23). The NAV
 * engine implementation is TASK-23.
 */
import type { UnixSeconds } from "@domain/shared/branded";
import type { TokenId } from "@domain/nffc/composition";
import type { PriceSource } from "@domain/pricing/types";

export interface ReferenceNav {
  readonly tokenId: TokenId;
  readonly value: number;
  readonly computedAt: UnixSeconds;
  /** Ids of the price observations used, for reproducibility. */
  readonly basis: readonly PriceSource[];
  /** `true` if any component price was stale or missing. */
  readonly degraded: boolean;
}

export interface NavPoint {
  readonly tokenId: TokenId;
  readonly value: number;
  readonly at: UnixSeconds;
  readonly degraded: boolean;
}

export type PerformanceWindow = "1D" | "7D" | "30D" | "SINCE_MINT";

export interface PerformancePoint {
  readonly window: PerformanceWindow;
  /** Fractional change over the window, e.g. `0.042` for +4.2%. */
  readonly change: number;
  readonly from: NavPoint;
  readonly to: NavPoint;
}
