/**
 * Reference NAV (TASK-23) — `Σ(weightᵢ × normalizedPriceᵢ)`, always labelled
 * "Reference NAV", never bare "value" (`docs/spec/07-ux-map.md` §6; TASK-23
 * acceptance) — this module's own return type is literally named
 * `ReferenceNav` (`domain/valuation/types.ts`, TASK-02) so that discipline is
 * enforced at the type level, not left to callers to remember.
 *
 * Pure: given a composition and a set of already-fetched `NormalizedPrice`s
 * (TASK-22's `PriceOracle` output), computes the weighted sum. No I/O here —
 * fetching prices and persisting the result is `workers/nav-materializer/`'s
 * job (`docs/price-engine.md`-adjacent orchestration, `docs/valuation.md`).
 */
import { BPS_TOTAL } from "@domain/nffc/composition";
import type { TokenId } from "@domain/nffc/composition";
import type { RepresentationId } from "@domain/registry/types";
import type { UnixSeconds } from "@domain/shared/branded";
import type { NormalizedPrice, PriceSource } from "@domain/pricing/types";
import type { ReferenceNav } from "@domain/valuation/types";

export interface CompositionWeight {
  readonly representationId: RepresentationId;
  readonly weightBps: number;
}

export class EmptyNavCompositionError extends Error {
  override name = "EmptyNavCompositionError";
  constructor() {
    super("Cannot compute a Reference NAV for a composition with no components.");
  }
}

/**
 * Degraded-input policy (`docs/spec/09-data-model.md`'s `nav_point.is_degraded`
 * — "true if any component price was stale or missing" — the computation
 * still proceeds, it doesn't abort):
 *
 * - A **stale** price (present, but past its heartbeat + grace) still
 *   contributes its last-known `normalized` value — the same choice
 *   `NffcMarketPanel` (TASK-15) already assumes by rendering a NAV number
 *   alongside its own "stale" warning badge, rather than hiding the number.
 * - A **missing** price (no observation at all for that representation)
 *   contributes `0` — there is no value to fall back to.
 *
 * Either case sets `degraded: true` on the result, and the missing/stale
 * component's `PriceSource` (when one exists) is still recorded in `basis`,
 * so the computation's inputs remain fully reproducible either way
 * (TASK-23 acceptance: "histórico persistido es reproducible a partir de los
 * precios de oráculo almacenados").
 */
export function computeReferenceNav(
  tokenId: TokenId,
  components: readonly CompositionWeight[],
  prices: ReadonlyMap<RepresentationId, NormalizedPrice>,
  computedAt: UnixSeconds,
): ReferenceNav {
  if (components.length === 0) throw new EmptyNavCompositionError();

  let value = 0;
  let degraded = false;
  const basis: PriceSource[] = [];

  for (const component of components) {
    const price = prices.get(component.representationId);
    const weight = component.weightBps / BPS_TOTAL;

    if (!price) {
      degraded = true;
      continue; // no observation at all — contributes 0, nothing to cite in `basis`
    }

    basis.push(price.source);
    if (price.stale) degraded = true;
    value += weight * price.normalized;
  }

  return { tokenId, value, computedAt, basis, degraded };
}
