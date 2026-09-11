/**
 * Persisted Reference NAV history (`docs/spec/09-data-model.md`'s `nav_point`
 * table). `record` takes the full `ReferenceNav` (with `basis`, the exact
 * `PriceSource`s used) so a persisted point stays independently reproducible;
 * `getHistory` returns the leaner `NavPoint` projection — everything
 * `computePerformanceWindows` needs, nothing a chart has to carry around.
 */
import type { TokenId } from "@domain/nffc/composition";
import type { NavPoint, ReferenceNav } from "@domain/valuation/types";

export interface NavStore {
  /** Idempotent on `(tokenId, computedAt)`. */
  record(nav: ReferenceNav): Promise<void>;
  /** Ascending by `at`. */
  getHistory(tokenId: TokenId, sinceUnixSeconds: number): Promise<readonly NavPoint[]>;
}
