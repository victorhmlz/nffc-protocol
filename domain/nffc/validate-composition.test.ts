import { describe, expect, it } from "vitest";
import type { AssetId, RepresentationId } from "@domain/registry/types";
import {
  validateComposition,
  type CandidateComponent,
  type RepresentationLookup,
} from "@domain/nffc/validate-composition";

function id<T>(s: string): T {
  return s as T;
}

const NVDA = id<AssetId>("0xNVDA");
const BTC = id<AssetId>("0xBTC");
const NVDA_REP = id<RepresentationId>("0xNVDArep");
const BTC_REP = id<RepresentationId>("0xBTCrep");

function comp(
  assetId: AssetId,
  representationId: RepresentationId,
  weightBps: number,
): CandidateComponent {
  return { assetId, representationId, weightBps };
}

/** Everything active and correctly resolving, unless overridden. */
function lookup(
  overrides: Partial<RepresentationLookup> = {},
): RepresentationLookup {
  return {
    isActiveRepresentation: () => true,
    resolvesTo: () => true,
    ...overrides,
  };
}

describe("validateComposition — happy path", () => {
  it("accepts a valid 2-component composition", () => {
    const result = validateComposition(
      [comp(NVDA, NVDA_REP, 6000), comp(BTC, BTC_REP, 4000)],
      lookup(),
    );
    expect(result).toEqual({ ok: true, issues: [], weightSumBps: 10_000 });
  });

  it("accepts exactly 1 and exactly 20 components", () => {
    expect(
      validateComposition([comp(NVDA, NVDA_REP, 10_000)], lookup()).ok,
    ).toBe(true);

    const twenty = Array.from({ length: 20 }, (_, i) =>
      comp(id(`0xa${i}`), id(`0xr${i}`), i === 0 ? 500 : 500),
    );
    expect(validateComposition(twenty, lookup()).ok).toBe(true);
  });
});

describe("validateComposition — collects every violation, not just the first", () => {
  it("reports I3 duplicate and I4 zero weight together", () => {
    const result = validateComposition(
      [comp(NVDA, NVDA_REP, 5000), comp(NVDA, NVDA_REP, 0)],
      lookup(),
    );
    const codes = result.issues.map((i) => i.code);
    expect(codes).toContain("I3_DUPLICATE_ASSET");
    expect(codes).toContain("I4_ZERO_WEIGHT");
    expect(codes).toContain("I2_WEIGHT_SUM"); // 5000 != 10000
    expect(result.ok).toBe(false);
  });
});

describe("validateComposition — I1 component count", () => {
  it("rejects zero components", () => {
    const result = validateComposition([], lookup());
    expect(result.issues.map((i) => i.code)).toEqual(["I1_COMPONENT_COUNT"]);
    expect(result.weightSumBps).toBe(0);
  });

  it("rejects 21 components", () => {
    const twentyOne = Array.from({ length: 21 }, (_, i) =>
      comp(id(`0xa${i}`), id(`0xr${i}`), 476),
    );
    const result = validateComposition(twentyOne, lookup());
    expect(result.issues.some((i) => i.code === "I1_COMPONENT_COUNT")).toBe(
      true,
    );
  });
});

describe("validateComposition — I2 weight sum", () => {
  it("flags 9999 and 10001", () => {
    expect(
      validateComposition(
        [comp(NVDA, NVDA_REP, 5999), comp(BTC, BTC_REP, 4000)],
        lookup(),
      ).issues.map((i) => i.code),
    ).toContain("I2_WEIGHT_SUM");
    expect(
      validateComposition(
        [comp(NVDA, NVDA_REP, 6001), comp(BTC, BTC_REP, 4000)],
        lookup(),
      ).issues.map((i) => i.code),
    ).toContain("I2_WEIGHT_SUM");
  });

  it("does not pile on an I2 error for an already-empty composition", () => {
    // I1 already covers "no components"; weightSumBps is still reported as 0.
    expect(
      validateComposition([], lookup()).issues.map((i) => i.code),
    ).not.toContain("I2_WEIGHT_SUM");
  });
});

describe("validateComposition — I5 / I6 registry checks", () => {
  it("flags an inactive representation", () => {
    const result = validateComposition(
      [comp(NVDA, NVDA_REP, 10_000)],
      lookup({ isActiveRepresentation: () => false }),
    );
    expect(result.issues.map((i) => i.code)).toEqual([
      "I5_REPRESENTATION_NOT_ACTIVE",
    ]);
  });

  it("flags a representation that resolves to a different asset", () => {
    const result = validateComposition(
      [comp(NVDA, BTC_REP, 10_000)],
      lookup({ resolvesTo: (_rep, assetId) => assetId === BTC }),
    );
    expect(result.issues.map((i) => i.code)).toEqual([
      "I6_REPRESENTATION_ASSET_MISMATCH",
    ]);
  });

  it("does not also flag I6 when I5 already failed for that component", () => {
    const result = validateComposition(
      [comp(NVDA, NVDA_REP, 10_000)],
      lookup({ isActiveRepresentation: () => false, resolvesTo: () => false }),
    );
    expect(result.issues.map((i) => i.code)).toEqual([
      "I5_REPRESENTATION_NOT_ACTIVE",
    ]);
  });
});

describe("validateComposition — issue messages are plain language", () => {
  it("every issue has a non-empty, human-readable message", () => {
    const result = validateComposition(
      [comp(NVDA, NVDA_REP, 0), comp(NVDA, NVDA_REP, 0)],
      lookup(),
    );
    for (const issue of result.issues) {
      expect(issue.message.length).toBeGreaterThan(10);
      expect(issue.message).not.toMatch(/^I[1-6]_/); // not just the raw code
    }
  });
});
