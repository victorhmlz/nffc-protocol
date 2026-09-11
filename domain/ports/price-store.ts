/**
 * Persisted price observations (`docs/spec/09-data-model.md`'s `price_point`
 * table) — the storage half of TASK-23's reproducibility acceptance
 * criterion: NAV history must be reproducible from stored oracle prices, so
 * every price a `NavStore.record` bases a NAV on is recorded here first.
 * Never the source of truth for a *live* price — `PriceOracle` (TASK-22) is;
 * this is the historical record.
 */
import type { RepresentationId } from "@domain/registry/types";
import type { NormalizedPrice } from "@domain/pricing/types";

export interface PriceStore {
  /** Idempotent on `(representationId, observedAt, source)` — recording the
   *  same observation twice is a no-op, not a duplicate row. */
  record(price: NormalizedPrice): Promise<void>;
  getLatest(representationId: RepresentationId): Promise<NormalizedPrice | null>;
  /** Ascending by `observedAt`. */
  getHistory(
    representationId: RepresentationId,
    sinceUnixSeconds: number,
  ): Promise<readonly NormalizedPrice[]>;
}
