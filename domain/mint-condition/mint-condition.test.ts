import { describe, expect, it } from "vitest";
import {
  AT_HIGH_BPS,
  MINT_CONDITION_SCHEMA,
  MintConditionInputError,
  computeMintCondition,
  toMetadataTrait,
  verifyMintCondition,
  type MintConditionInput,
  type OracleObservationAtMint,
} from "@domain/mint-condition/mint-condition";

function obs(
  representationId: string,
  priceAtMint: number,
  allTimeHigh: number,
  extra: Partial<OracleObservationAtMint> = {},
): OracleObservationAtMint {
  return {
    representationId,
    priceAtMint,
    allTimeHigh,
    source: `chainlink:0xfeed_${representationId}`,
    roundId: `round_${representationId}`,
    observedAt: 1_700_000_000,
    ...extra,
  };
}

function input(over: Partial<MintConditionInput> = {}): MintConditionInput {
  return {
    tokenId: "1",
    mintedAtBlock: 5000,
    mintedAt: 1_700_000_050,
    components: [
      { representationId: "0xNVDA", weightBps: 6000 },
      { representationId: "0xBTC", weightBps: 4000 },
    ],
    observations: [obs("0xNVDA", 100, 100), obs("0xBTC", 80, 100)],
    ...over,
  };
}

describe("computeMintCondition", () => {
  it("weights the per-component drawdown (NVDA at ATH 60%, BTC 20%-down 40%)", () => {
    const t = computeMintCondition(input());
    // NVDA dd=0, BTC dd=2000 → weighted = round((6000*0 + 4000*2000)/10000) = 800
    expect(t.weightedDrawdownBps).toBe(800);
    expect(t.components[0]).toMatchObject({
      representationId: "0xNVDA",
      drawdownBps: 0,
      atHigh: true,
    });
    expect(t.components[1]).toMatchObject({
      representationId: "0xBTC",
      drawdownBps: 2000,
      atHigh: false,
    });
    expect(t.componentsAtHigh).toBe(1);
    expect(t.regime).toBe("near-highs");
    expect(t.schema).toBe(MINT_CONDITION_SCHEMA);
  });

  it("carries the exact oracle rounds as the reproduction basis, in component order", () => {
    const t = computeMintCondition(input());
    expect(t.basis).toEqual([
      {
        representationId: "0xNVDA",
        source: "chainlink:0xfeed_0xNVDA",
        roundId: "round_0xNVDA",
        observedAt: 1_700_000_000,
      },
      {
        representationId: "0xBTC",
        source: "chainlink:0xfeed_0xBTC",
        roundId: "round_0xBTC",
        observedAt: 1_700_000_000,
      },
    ]);
  });

  it("whole set at its highs → weightedDrawdownBps 0, regime at-highs", () => {
    const t = computeMintCondition(
      input({
        observations: [obs("0xNVDA", 100, 100), obs("0xBTC", 100, 100)],
      }),
    );
    expect(t.weightedDrawdownBps).toBe(0);
    expect(t.regime).toBe("at-highs");
    expect(t.componentsAtHigh).toBe(2);
  });

  it("deep drawdown across the set → regime deep-drawdown", () => {
    const t = computeMintCondition(
      input({ observations: [obs("0xNVDA", 50, 100), obs("0xBTC", 40, 100)] }),
    );
    // dd: NVDA 5000, BTC 6000 → weighted = round((6000*5000 + 4000*6000)/10000) = 5400
    expect(t.weightedDrawdownBps).toBe(5400);
    expect(t.regime).toBe("deep-drawdown");
  });

  it("a price at or above its ATH clamps the component drawdown to 0", () => {
    const t = computeMintCondition(
      input({
        observations: [obs("0xNVDA", 120, 100), obs("0xBTC", 100, 100)],
      }),
    );
    expect(t.components[0]!.drawdownBps).toBe(0);
    expect(t.components[0]!.atHigh).toBe(true);
  });

  it("`atHigh` uses the AT_HIGH_BPS threshold", () => {
    const justInside = computeMintCondition(
      input({
        observations: [
          obs("0xNVDA", 100, 100),
          obs("0xBTC", 100 - 100 * (AT_HIGH_BPS / 10000), 100),
        ],
      }),
    );
    expect(justInside.components[1]!.drawdownBps).toBe(AT_HIGH_BPS);
    expect(justInside.components[1]!.atHigh).toBe(true);
  });

  it("is deterministic — same input yields a deep-equal trait", () => {
    expect(computeMintCondition(input())).toEqual(
      computeMintCondition(input()),
    );
  });
});

describe("verifyMintCondition — reproducibility", () => {
  it("passes when recomputed from the same (re-fetched) inputs", () => {
    const stored = computeMintCondition(input());
    expect(verifyMintCondition(stored, input())).toEqual({
      ok: true,
      mismatches: [],
    });
  });

  it("flags a tampered stored value", () => {
    const stored = {
      ...computeMintCondition(input()),
      weightedDrawdownBps: 42,
    };
    const res = verifyMintCondition(stored, input());
    expect(res.ok).toBe(false);
    expect(res.mismatches.join(" ")).toMatch(/weightedDrawdownBps/);
  });

  it("flags a tampered per-component drawdown", () => {
    const base = computeMintCondition(input());
    const stored = {
      ...base,
      components: [
        { ...base.components[0]!, drawdownBps: 9999 },
        base.components[1]!,
      ],
    };
    const res = verifyMintCondition(stored, input());
    expect(res.ok).toBe(false);
    expect(res.mismatches.join(" ")).toMatch(/components\[0\]\.drawdownBps/);
  });

  it("reports a recompute failure rather than throwing", () => {
    const stored = computeMintCondition(input());
    const res = verifyMintCondition(
      stored,
      input({ observations: [obs("0xNVDA", 100, 100)] }),
    );
    expect(res.ok).toBe(false);
    expect(res.mismatches[0]).toMatch(/recompute failed/);
  });
});

describe("rejects inputs the invariants forbid", () => {
  it("empty composition", () => {
    expect(() =>
      computeMintCondition(input({ components: [], observations: [] })),
    ).toThrow(MintConditionInputError);
  });

  it("weights not summing to 10,000", () => {
    expect(() =>
      computeMintCondition(
        input({
          components: [{ representationId: "0xNVDA", weightBps: 5000 }],
          observations: [obs("0xNVDA", 1, 1)],
        }),
      ),
    ).toThrow(/sum to 5000/);
  });

  it("a missing observation for a component", () => {
    expect(() =>
      computeMintCondition(input({ observations: [obs("0xNVDA", 100, 100)] })),
    ).toThrow(/expected 2 observations/);
  });

  it("a duplicate observation", () => {
    expect(() =>
      computeMintCondition(
        input({
          observations: [obs("0xNVDA", 100, 100), obs("0xNVDA", 100, 100)],
        }),
      ),
    ).toThrow(/duplicate observation/);
  });

  it("a non-positive price or ATH", () => {
    expect(() =>
      computeMintCondition(
        input({ observations: [obs("0xNVDA", 0, 100), obs("0xBTC", 80, 100)] }),
      ),
    ).toThrow(/priceAtMint must be > 0/);
    expect(() =>
      computeMintCondition(
        input({ observations: [obs("0xNVDA", 100, 0), obs("0xBTC", 80, 100)] }),
      ),
    ).toThrow(/allTimeHigh must be > 0/);
  });

  it("a negative mint block", () => {
    expect(() => computeMintCondition(input({ mintedAtBlock: -1 }))).toThrow(
      /mintedAtBlock/,
    );
  });
});

describe("toMetadataTrait", () => {
  it("flattens to string/number pairs for the static metadata", () => {
    const t = computeMintCondition(input());
    expect(toMetadataTrait(t)).toEqual({
      "Weighted Drawdown (bps)": 800,
      Regime: "near-highs",
      "Components At Highs": 1,
      "Minted At Block": 5000,
    });
  });
});
