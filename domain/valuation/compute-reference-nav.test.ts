import { describe, expect, it } from "vitest";
import type { TokenId } from "@domain/nffc/composition";
import type { RepresentationId } from "@domain/registry/types";
import type { UnixSeconds } from "@domain/shared/branded";
import type { NormalizedPrice, PriceSource } from "@domain/pricing/types";
import { computeReferenceNav, EmptyNavCompositionError } from "@domain/valuation/compute-reference-nav";

const TOKEN_ID = 7n as TokenId;
const NVDA_REP = "0xnvda" as RepresentationId;
const BTC_REP = "0xbtc" as RepresentationId;
const NOW = 1_800_000_000 as UnixSeconds;

function price(overrides: Partial<NormalizedPrice> & { representationId: RepresentationId; normalized: number }): NormalizedPrice {
  return {
    raw: 1n,
    priceDecimals: 8,
    observedAt: NOW,
    source: `static:${overrides.representationId}` as PriceSource,
    multiplier: 1,
    stale: false,
    ...overrides,
  };
}

describe("computeReferenceNav — the weighted sum", () => {
  it("computes Σ(weight × normalizedPrice) for a fully-priced composition", () => {
    const nav = computeReferenceNav(
      TOKEN_ID,
      [
        { representationId: NVDA_REP, weightBps: 6000 },
        { representationId: BTC_REP, weightBps: 4000 },
      ],
      new Map([
        [NVDA_REP, price({ representationId: NVDA_REP, normalized: 900 })],
        [BTC_REP, price({ representationId: BTC_REP, normalized: 65_000 })],
      ]),
      NOW,
    );
    expect(nav.value).toBeCloseTo(0.6 * 900 + 0.4 * 65_000);
    expect(nav.tokenId).toBe(TOKEN_ID);
    expect(nav.computedAt).toBe(NOW);
    expect(nav.degraded).toBe(false);
    expect(nav.basis).toHaveLength(2);
  });

  it("throws EmptyNavCompositionError for a composition with no components", () => {
    expect(() => computeReferenceNav(TOKEN_ID, [], new Map(), NOW)).toThrow(EmptyNavCompositionError);
  });

  it("a single 100% component equals its own normalized price", () => {
    const nav = computeReferenceNav(
      TOKEN_ID,
      [{ representationId: BTC_REP, weightBps: 10_000 }],
      new Map([[BTC_REP, price({ representationId: BTC_REP, normalized: 65_000 })]]),
      NOW,
    );
    expect(nav.value).toBeCloseTo(65_000);
  });
});

describe("computeReferenceNav — degraded-input policy", () => {
  it("a missing price contributes 0 and marks the result degraded", () => {
    const nav = computeReferenceNav(
      TOKEN_ID,
      [
        { representationId: NVDA_REP, weightBps: 5000 },
        { representationId: BTC_REP, weightBps: 5000 },
      ],
      new Map([[NVDA_REP, price({ representationId: NVDA_REP, normalized: 900 })]]), // BTC missing
      NOW,
    );
    expect(nav.degraded).toBe(true);
    expect(nav.value).toBeCloseTo(0.5 * 900); // BTC contributed 0, not NaN/undefined
    expect(nav.basis).toHaveLength(1); // only the resolved price is cited
  });

  it("a stale price still contributes its last-known value, but marks the result degraded", () => {
    const nav = computeReferenceNav(
      TOKEN_ID,
      [{ representationId: BTC_REP, weightBps: 10_000 }],
      new Map([[BTC_REP, price({ representationId: BTC_REP, normalized: 65_000, stale: true })]]),
      NOW,
    );
    expect(nav.degraded).toBe(true);
    expect(nav.value).toBeCloseTo(65_000); // not zeroed out
    expect(nav.basis).toHaveLength(1); // the stale source is still cited, for reproducibility
  });

  it("is not degraded when every price resolves and none are stale", () => {
    const nav = computeReferenceNav(
      TOKEN_ID,
      [{ representationId: BTC_REP, weightBps: 10_000 }],
      new Map([[BTC_REP, price({ representationId: BTC_REP, normalized: 65_000 })]]),
      NOW,
    );
    expect(nav.degraded).toBe(false);
  });
});
