import { describe, expect, it } from "vitest";
import type { IndexedComponent, IndexedNffcSummary } from "@domain/marketplace/listings";
import type { MarketDataPoint, NffcMarketSnapshot } from "@domain/metadata/metadata";
import type { PerformancePoint } from "@domain/valuation/types";
import type { TokenId } from "@domain/nffc/composition";
import type { UnixSeconds } from "@domain/shared/branded";
import { aggregatePortfolio, type PortfolioHolding } from "@domain/portfolio/portfolio";

const OWNER = "0x1111111111111111111111111111111111aaaa";
const NOW = 1_800_000_000 as UnixSeconds;
const SOME_TOKEN = 0n as TokenId;

function nffc(overrides: Partial<IndexedNffcSummary> & { tokenId: string }): IndexedNffcSummary {
  return {
    collectionId: "1",
    collectionName: "Blue Chips",
    creatorAddress: OWNER,
    ownerAddress: OWNER,
    segment: "MIXED",
    staticRarity: 0.5,
    mintConditionRegime: "mid",
    componentCount: 1,
    components: [{ position: 0, assetId: "asset:btc", assetSymbol: "BTC", assetClass: "CRYPTO", weightBps: 10_000 }],
    artURI: "data:image/svg+xml,x",
    mintedAt: "2026-08-01T00:00:00.000Z",
    listing: null,
    ...overrides,
  };
}

function point(value: number, opts?: Partial<MarketDataPoint>): MarketDataPoint {
  return { value, source: "static", observedAt: NOW, stale: false, ...opts };
}

function snapshot(overrides: Partial<NffcMarketSnapshot> & { tokenId: string }): NffcMarketSnapshot {
  return {
    referenceNav: null,
    components: [],
    performance: [],
    asOf: NOW,
    degraded: false,
    ...overrides,
  };
}

function perf(window: PerformancePoint["window"], change: number, toValue: number): PerformancePoint {
  return {
    window,
    change,
    from: { tokenId: SOME_TOKEN, value: toValue / (1 + change), at: NOW, degraded: false },
    to: { tokenId: SOME_TOKEN, value: toValue, at: NOW, degraded: false },
  };
}

function holding(n: IndexedNffcSummary, m: NffcMarketSnapshot): PortfolioHolding {
  return { nffc: n, market: m };
}

describe("aggregatePortfolio — totals and degraded policy", () => {
  it("an empty portfolio has zero value, is not degraded, and has empty aggregates", () => {
    const p = aggregatePortfolio(OWNER, [], NOW);
    expect(p.totalReferenceValue).toBe(0);
    expect(p.degraded).toBe(false);
    expect(p.performance).toEqual([]);
    expect(p.exposureByAsset).toEqual([]);
    expect(p.exposureBySegment).toEqual([]);
    expect(p.exposureByCollection).toEqual([]);
  });

  it("sums each holding's Reference NAV into the total", () => {
    const h1 = holding(nffc({ tokenId: "1" }), snapshot({ tokenId: "1", referenceNav: point(1000) }));
    const h2 = holding(nffc({ tokenId: "2" }), snapshot({ tokenId: "2", referenceNav: point(2500) }));
    const p = aggregatePortfolio(OWNER, [h1, h2], NOW);
    expect(p.totalReferenceValue).toBe(3500);
    expect(p.degraded).toBe(false);
  });

  it("a holding with no snapshot contributes 0 and marks the portfolio degraded", () => {
    const priced = holding(nffc({ tokenId: "1" }), snapshot({ tokenId: "1", referenceNav: point(1000) }));
    const unavailable = holding(
      nffc({ tokenId: "2" }),
      snapshot({ tokenId: "2", referenceNav: null, degraded: true, unavailableReason: "no engine yet" }),
    );
    const p = aggregatePortfolio(OWNER, [priced, unavailable], NOW);
    expect(p.totalReferenceValue).toBe(1000); // the missing holding contributed 0, not NaN
    expect(p.degraded).toBe(true);
  });

  it("a stale snapshot still contributes its value, but marks the portfolio degraded", () => {
    const h = holding(
      nffc({ tokenId: "1" }),
      snapshot({ tokenId: "1", referenceNav: point(1000, { stale: true }), degraded: true }),
    );
    const p = aggregatePortfolio(OWNER, [h], NOW);
    expect(p.totalReferenceValue).toBe(1000);
    expect(p.degraded).toBe(true);
  });
});

describe("aggregatePortfolio — exposure by asset", () => {
  it("splits one holding's value across its components by weight", () => {
    const h = holding(
      nffc({
        tokenId: "1",
        components: [
          { position: 0, assetId: "asset:nvda", assetSymbol: "NVDA", assetClass: "EQUITY", weightBps: 6000 },
          { position: 1, assetId: "asset:btc", assetSymbol: "BTC", assetClass: "CRYPTO", weightBps: 4000 },
        ],
      }),
      snapshot({ tokenId: "1", referenceNav: point(1000) }),
    );
    const p = aggregatePortfolio(OWNER, [h], NOW);
    const nvda = p.exposureByAsset.find((e) => e.assetId === "asset:nvda");
    const btc = p.exposureByAsset.find((e) => e.assetId === "asset:btc");
    expect(nvda?.value).toBeCloseTo(600);
    expect(btc?.value).toBeCloseTo(400);
    expect(nvda?.weightOfPortfolio).toBeCloseTo(0.6);
  });

  it("sums the same asset across multiple holdings", () => {
    const btcOnly: IndexedComponent[] = [
      { position: 0, assetId: "asset:btc", assetSymbol: "BTC", assetClass: "CRYPTO", weightBps: 10_000 },
    ];
    const h1 = holding(
      nffc({ tokenId: "1", components: btcOnly }),
      snapshot({ tokenId: "1", referenceNav: point(500) }),
    );
    const h2 = holding(
      nffc({ tokenId: "2", components: btcOnly }),
      snapshot({ tokenId: "2", referenceNav: point(1500) }),
    );
    const p = aggregatePortfolio(OWNER, [h1, h2], NOW);
    expect(p.exposureByAsset).toHaveLength(1);
    expect(p.exposureByAsset[0]?.value).toBeCloseTo(2000);
    expect(p.exposureByAsset[0]?.weightOfPortfolio).toBeCloseTo(1);
  });

  it("is sorted by value descending", () => {
    const h = holding(
      nffc({
        tokenId: "1",
        components: [
          { position: 0, assetId: "asset:small", assetSymbol: "SM", assetClass: "CRYPTO", weightBps: 1000 },
          { position: 1, assetId: "asset:big", assetSymbol: "BIG", assetClass: "CRYPTO", weightBps: 9000 },
        ],
      }),
      snapshot({ tokenId: "1", referenceNav: point(1000) }),
    );
    const p = aggregatePortfolio(OWNER, [h], NOW);
    expect(p.exposureByAsset.map((e) => e.assetId)).toEqual(["asset:big", "asset:small"]);
  });

  it("weightOfPortfolio is 0, not NaN, when total value is 0", () => {
    const h = holding(nffc({ tokenId: "1" }), snapshot({ tokenId: "1", referenceNav: null, degraded: true }));
    const p = aggregatePortfolio(OWNER, [h], NOW);
    expect(p.exposureByAsset.every((e) => e.weightOfPortfolio === 0)).toBe(true);
  });
});

describe("aggregatePortfolio — exposure by segment and by collection", () => {
  it("groups value and counts holdings per segment", () => {
    const h1 = holding(
      nffc({ tokenId: "1", segment: "CRYPTO_ONLY" }),
      snapshot({ tokenId: "1", referenceNav: point(1000) }),
    );
    const h2 = holding(
      nffc({ tokenId: "2", segment: "CRYPTO_ONLY" }),
      snapshot({ tokenId: "2", referenceNav: point(500) }),
    );
    const h3 = holding(
      nffc({ tokenId: "3", segment: "STOCK_ONLY" }),
      snapshot({ tokenId: "3", referenceNav: point(1500) }),
    );
    const p = aggregatePortfolio(OWNER, [h1, h2, h3], NOW);
    const crypto = p.exposureBySegment.find((s) => s.segment === "CRYPTO_ONLY");
    const stock = p.exposureBySegment.find((s) => s.segment === "STOCK_ONLY");
    expect(crypto).toMatchObject({ value: 1500, holdingCount: 2 });
    expect(stock).toMatchObject({ value: 1500, holdingCount: 1 });
    expect(crypto?.weightOfPortfolio).toBeCloseTo(0.5);
  });

  it("groups value and counts holdings per collection", () => {
    const h1 = holding(
      nffc({ tokenId: "1", collectionId: "1", collectionName: "Blue Chips" }),
      snapshot({ tokenId: "1", referenceNav: point(1000) }),
    );
    const h2 = holding(
      nffc({ tokenId: "2", collectionId: "2", collectionName: "Momentum" }),
      snapshot({ tokenId: "2", referenceNav: point(3000) }),
    );
    const p = aggregatePortfolio(OWNER, [h1, h2], NOW);
    expect(p.exposureByCollection).toHaveLength(2);
    expect(p.exposureByCollection[0]).toMatchObject({ collectionId: "2", value: 3000, holdingCount: 1 });
  });
});

describe("aggregatePortfolio — performance", () => {
  it("value-weights each holding's change for a window they share", () => {
    const h1 = holding(
      nffc({ tokenId: "1" }),
      snapshot({ tokenId: "1", referenceNav: point(1000), performance: [perf("1D", 0.1, 1000)] }),
    );
    const h2 = holding(
      nffc({ tokenId: "2" }),
      snapshot({ tokenId: "2", referenceNav: point(3000), performance: [perf("1D", -0.02, 3000)] }),
    );
    const p = aggregatePortfolio(OWNER, [h1, h2], NOW);
    const oneDay = p.performance.find((w) => w.window === "1D");
    // (1000*0.1 + 3000*-0.02) / 4000 = (100 - 60) / 4000 = 0.01
    expect(oneDay?.change).toBeCloseTo(0.01);
    expect(oneDay?.holdingsIncluded).toBe(2);
  });

  it("omits a window entirely when no holding has it yet", () => {
    const h = holding(
      nffc({ tokenId: "1" }),
      snapshot({ tokenId: "1", referenceNav: point(1000), performance: [perf("1D", 0.05, 1000)] }),
    );
    const p = aggregatePortfolio(OWNER, [h], NOW);
    expect(p.performance.some((w) => w.window === "SINCE_MINT")).toBe(false);
    expect(p.performance).toHaveLength(1);
  });

  it("an empty-performance holding (unavailable snapshot) contributes to no window", () => {
    const h = holding(nffc({ tokenId: "1" }), snapshot({ tokenId: "1", referenceNav: null, degraded: true }));
    const p = aggregatePortfolio(OWNER, [h], NOW);
    expect(p.performance).toEqual([]);
  });
});
