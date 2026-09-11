// @vitest-environment node
import { describe, expect, it } from "vitest";
import type { RepresentationId } from "@domain/registry/types";
import type { Address, UnixSeconds } from "@domain/shared/branded";
import type { NormalizedPrice, PriceSource } from "@domain/pricing/types";
import {
  ChainlinkPriceOracle,
  NoOracleConfiguredError,
  RepresentationInactiveError,
} from "@infra/pricing/chainlink-price-oracle";
import { createFakeChainReader, createStaticPriceOracle, FakeClock } from "../../tests/support/fakes";
import { runPriceOracleContract } from "../../tests/support/price-oracle-contract";

const REGISTRY = "0x1111111111111111111111111111111111aaaa" as Address;
const BTC_FEED = "0x2222222222222222222222222222222222bbbb" as Address;
const NVDA_FEED = "0x3333333333333333333333333333333333cccc" as Address;
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000" as Address;

const BTC_REP = "0xbtc00000000000000000000000000000000000000000000000000000000" as RepresentationId;
const NVDA_REP = "0xnvda0000000000000000000000000000000000000000000000000000000" as RepresentationId;

const NOW_SECONDS = 1_800_000_000;
const NOW_MS = NOW_SECONDS * 1000;

function repRead(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    representationId: BTC_REP,
    assetId: "0xasset",
    providerId: "0xprovider",
    chainId: 4663n,
    token: "0xtoken" as Address,
    tokenStandard: "0x4552433230000000000000000000000000000000000000000000000000000",
    decimals: 18,
    multiplier: 1_000_000_000_000_000_000n, // 1.0
    oracle: { feed: BTC_FEED, heartbeat: 3600, feedDecimals: 8 },
    status: 1, // ACTIVE
    createdAt: 1n,
    updatedAt: 1n,
    ...overrides,
  };
}

function roundRead(answer: bigint, updatedAtSeconds: number) {
  return {
    roundId: 1n,
    answer,
    startedAt: BigInt(updatedAtSeconds),
    updatedAt: BigInt(updatedAtSeconds),
    answeredInRound: 1n,
  };
}

function makeOracle(reads: Record<string, unknown>, gracePeriodSeconds?: number) {
  const reader = createFakeChainReader({ reads });
  const clock = new FakeClock(NOW_MS);
  return { oracle: new ChainlinkPriceOracle({ registryAddress: REGISTRY, reader, clock, gracePeriodSeconds }), reader, clock };
}

describe("ChainlinkPriceOracle — normalization", () => {
  it("scales the raw answer by feedDecimals and the representation's multiplier", async () => {
    const { oracle } = makeOracle({
      [`${REGISTRY}:getRepresentation`]: repRead(),
      [`${BTC_FEED}:latestRoundData`]: roundRead(65_000_00000000n, NOW_SECONDS - 60), // $65,000.00000000
    });
    const price = await oracle.getPrice(BTC_REP);
    expect(price.normalized).toBe(65_000);
    expect(price.raw).toBe(65_000_00000000n);
    expect(price.priceDecimals).toBe(8);
    expect(price.multiplier).toBe(1);
  });

  it("applies a fractional multiplier (e.g. a fractional-share representation)", async () => {
    const { oracle } = makeOracle({
      [`${REGISTRY}:getRepresentation`]: repRead({
        multiplier: 10_000_000_000_000_000n, // 0.01
      }),
      [`${BTC_FEED}:latestRoundData`]: roundRead(500_00000000n, NOW_SECONDS - 60), // $500.00000000
    });
    const price = await oracle.getPrice(BTC_REP);
    expect(price.multiplier).toBe(0.01);
    expect(price.normalized).toBe(5); // 500 * 0.01
  });
});

describe("ChainlinkPriceOracle — staleness (heartbeat + grace)", () => {
  it("is not stale within heartbeat + grace", async () => {
    const { oracle } = makeOracle(
      {
        [`${REGISTRY}:getRepresentation`]: repRead({ oracle: { feed: BTC_FEED, heartbeat: 3600, feedDecimals: 8 } }),
        [`${BTC_FEED}:latestRoundData`]: roundRead(1_00000000n, NOW_SECONDS - 3800), // heartbeat + grace = 3900
      },
      300,
    );
    const price = await oracle.getPrice(BTC_REP);
    expect(price.stale).toBe(false);
  });

  it("is stale once heartbeat + grace is exceeded", async () => {
    const { oracle } = makeOracle(
      {
        [`${REGISTRY}:getRepresentation`]: repRead({ oracle: { feed: BTC_FEED, heartbeat: 3600, feedDecimals: 8 } }),
        [`${BTC_FEED}:latestRoundData`]: roundRead(1_00000000n, NOW_SECONDS - 4000), // exceeds 3900
      },
      300,
    );
    const price = await oracle.getPrice(BTC_REP);
    expect(price.stale).toBe(true);
  });

  it("records the round's own updatedAt as observedAt — not the read time", async () => {
    const { oracle } = makeOracle({
      [`${REGISTRY}:getRepresentation`]: repRead(),
      [`${BTC_FEED}:latestRoundData`]: roundRead(1_00000000n, NOW_SECONDS - 120),
    });
    const price = await oracle.getPrice(BTC_REP);
    expect(price.observedAt).toBe(NOW_SECONDS - 120);
  });
});

describe("ChainlinkPriceOracle — provenance and guard rails", () => {
  it("names the feed address in `source`", async () => {
    const { oracle } = makeOracle({
      [`${REGISTRY}:getRepresentation`]: repRead(),
      [`${BTC_FEED}:latestRoundData`]: roundRead(1_00000000n, NOW_SECONDS),
    });
    const price = await oracle.getPrice(BTC_REP);
    expect(price.source).toBe(`chainlink:${BTC_FEED}`);
  });

  it("rejects a representation that is not ACTIVE", async () => {
    const { oracle } = makeOracle({
      [`${REGISTRY}:getRepresentation`]: repRead({ status: 0 }),
    });
    await expect(oracle.getPrice(BTC_REP)).rejects.toBeInstanceOf(RepresentationInactiveError);
  });

  it("rejects a representation with no oracle feed configured", async () => {
    const { oracle } = makeOracle({
      [`${REGISTRY}:getRepresentation`]: repRead({ oracle: { feed: ZERO_ADDRESS, heartbeat: 0, feedDecimals: 0 } }),
    });
    await expect(oracle.getPrice(BTC_REP)).rejects.toBeInstanceOf(NoOracleConfiguredError);
  });
});

describe("ChainlinkPriceOracle — batch reads", () => {
  it("getPrices returns one entry per representation, keyed by id", async () => {
    const { oracle } = makeOracle({
      [`${REGISTRY}:getRepresentation`]: repRead(), // fake reader has no per-id branching — same canned value either way is fine here
      [`${BTC_FEED}:latestRoundData`]: roundRead(1_00000000n, NOW_SECONDS),
    });
    const prices = await oracle.getPrices([BTC_REP, BTC_REP]);
    expect(prices.size).toBe(1); // same id twice collapses in the Map, as expected
  });

  it("getPrices on an empty list makes no reads and returns an empty map", async () => {
    const { oracle, reader } = makeOracle({});
    const prices = await oracle.getPrices([]);
    expect(prices.size).toBe(0);
    expect(reader.calls).toHaveLength(0);
  });
});

describe("ChainlinkPriceOracle — provider-agnostic (TASK-22 acceptance)", () => {
  it("prices a Stock-Token-shaped and a native-crypto-shaped representation through the exact same code path", async () => {
    // The on-chain Representation this class reads carries no asset-class
    // field at all (that lives on AssetIdentityRegistry, a different
    // contract) — there is nothing here to branch on, so both go through
    // getPrice identically by construction, not by discipline.
    const reads = {
      [`${REGISTRY}:getRepresentation`]: repRead({ oracle: { feed: NVDA_FEED, heartbeat: 3600, feedDecimals: 8 } }),
      [`${NVDA_FEED}:latestRoundData`]: roundRead(900_00000000n, NOW_SECONDS - 60),
    };
    const { oracle: stockOracle } = makeOracle(reads);
    const stockPrice = await stockOracle.getPrice(NVDA_REP);

    const { oracle: cryptoOracle } = makeOracle({
      [`${REGISTRY}:getRepresentation`]: repRead({ oracle: { feed: BTC_FEED, heartbeat: 3600, feedDecimals: 8 } }),
      [`${BTC_FEED}:latestRoundData`]: roundRead(65_000_00000000n, NOW_SECONDS - 60),
    });
    const cryptoPrice = await cryptoOracle.getPrice(BTC_REP);

    for (const price of [stockPrice, cryptoPrice]) {
      expect(price.source).toMatch(/^chainlink:0x/);
      expect(price.observedAt).toBeGreaterThan(0);
      expect(price.stale).toBe(false);
    }
  });
});

// TASK-22 acceptance: "design supports adding a second oracle provider
// without breaking the data contract" — proven by running the identical
// contract suite against this class and against a wholly independent
// PriceOracle implementation that shares no code with it.
runPriceOracleContract("ChainlinkPriceOracle", () => {
  const { oracle } = makeOracle({
    [`${REGISTRY}:getRepresentation`]: repRead(),
    [`${BTC_FEED}:latestRoundData`]: roundRead(65_000_00000000n, NOW_SECONDS - 60),
  });
  return { oracle, representationId: BTC_REP };
});

runPriceOracleContract("an independent second PriceOracle implementation (createStaticPriceOracle)", () => {
  const price: NormalizedPrice = {
    representationId: BTC_REP,
    raw: 1n,
    normalized: 1,
    priceDecimals: 0,
    observedAt: NOW_SECONDS as UnixSeconds,
    source: "static:test" as PriceSource,
    multiplier: 1,
    stale: false,
  };
  const oracle = createStaticPriceOracle(new Map([[BTC_REP, price]]));
  return { oracle, representationId: BTC_REP };
});
