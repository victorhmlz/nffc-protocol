import { describe, expect, it } from "vitest";
import type { TokenId } from "@domain/nffc/composition";
import type { RepresentationId } from "@domain/registry/types";
import type { UnixSeconds } from "@domain/shared/branded";
import type { NormalizedPrice, PriceSource } from "@domain/pricing/types";
import { materializeReferenceNav } from "./materialize";
import { createFakeLogger, createInMemoryNavStore, createInMemoryPriceStore, createStaticPriceOracle } from "../../tests/support/fakes";

const TOKEN_ID = 7n as TokenId;
const NVDA_REP = "0xnvda" as RepresentationId;
const BTC_REP = "0xbtc" as RepresentationId;
const NOW = 1_800_000_000 as UnixSeconds;

function price(representationId: RepresentationId, normalized: number, stale = false): NormalizedPrice {
  return {
    representationId,
    raw: BigInt(Math.round(normalized * 1e8)),
    normalized,
    priceDecimals: 8,
    observedAt: NOW,
    source: `static:${representationId}` as PriceSource,
    multiplier: 1,
    stale,
  };
}

describe("materializeReferenceNav — happy path", () => {
  it("computes and persists the Reference NAV, and records every fetched price", async () => {
    const priceOracle = createStaticPriceOracle(
      new Map([
        [NVDA_REP, price(NVDA_REP, 900)],
        [BTC_REP, price(BTC_REP, 65_000)],
      ]),
    );
    const priceStore = createInMemoryPriceStore();
    const navStore = createInMemoryNavStore();

    const summary = await materializeReferenceNav({
      tokenId: TOKEN_ID,
      getComposition: async () => [
        { representationId: NVDA_REP, weightBps: 6000 },
        { representationId: BTC_REP, weightBps: 4000 },
      ],
      priceOracle,
      priceStore,
      navStore,
      now: () => NOW,
      logger: createFakeLogger(),
    });

    expect(summary.referenceNav).toBeCloseTo(0.6 * 900 + 0.4 * 65_000);
    expect(summary.degraded).toBe(false);
    expect(summary.componentCount).toBe(2);
    expect(summary.at).toBe(NOW);

    expect(priceStore.records).toHaveLength(2);
    expect(navStore.records).toHaveLength(1);
    expect(navStore.records[0]!.tokenId).toBe(TOKEN_ID);
    expect(navStore.records[0]!.basis).toHaveLength(2);
  });
});

describe("materializeReferenceNav — degraded input", () => {
  it("marks the NAV degraded when the oracle's map omits a requested representation", async () => {
    // A real PriceOracle.getPrices always returns one entry per id (TASK-22's
    // contract) or rejects — so "missing" in practice means the batch caller
    // catches a rejection and proceeds with a partial map. This test exercises
    // computeReferenceNav's own degraded path directly via a hand-built
    // partial price map, using a priceOracle stub that mimics that outcome.
    const partialOracle = {
      async getPrice(id: RepresentationId) {
        if (id === NVDA_REP) return price(NVDA_REP, 900);
        throw new Error("no price");
      },
      async getPrices() {
        return new Map([[NVDA_REP, price(NVDA_REP, 900)]]); // BTC_REP omitted
      },
    };
    const priceStore = createInMemoryPriceStore();
    const navStore = createInMemoryNavStore();

    const summary = await materializeReferenceNav({
      tokenId: TOKEN_ID,
      getComposition: async () => [
        { representationId: NVDA_REP, weightBps: 5000 },
        { representationId: BTC_REP, weightBps: 5000 },
      ],
      priceOracle: partialOracle,
      priceStore,
      navStore,
      now: () => NOW,
      logger: createFakeLogger(),
    });

    expect(summary.degraded).toBe(true);
    expect(summary.referenceNav).toBeCloseTo(0.5 * 900); // BTC contributes 0
    expect(priceStore.records).toHaveLength(1); // only the one price that resolved was ever fetched
  });

  it("marks the NAV degraded, but still uses the value, when a returned price is itself stale", async () => {
    const priceOracle = createStaticPriceOracle(new Map([[NVDA_REP, price(NVDA_REP, 900, true)]]));
    const navStore = createInMemoryNavStore();

    const summary = await materializeReferenceNav({
      tokenId: TOKEN_ID,
      getComposition: async () => [{ representationId: NVDA_REP, weightBps: 10_000 }],
      priceOracle,
      priceStore: createInMemoryPriceStore(),
      navStore,
      now: () => NOW,
      logger: createFakeLogger(),
    });

    expect(summary.degraded).toBe(true);
    expect(summary.referenceNav).toBeCloseTo(900); // the stale price still contributes its value
  });
});
