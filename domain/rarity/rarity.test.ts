import { describe, expect, it } from "vitest";
import type { TokenId, WeightBps } from "@domain/nffc/composition";
import type { StaticRarityInputs } from "@domain/rarity/types";
import {
  StaticRarityInputError,
  RARITY_WAD,
  computeStaticRarity,
  staticRarityScore,
  staticRarityWad,
} from "@domain/rarity/rarity";

const wad = (n: readonly number[]) => staticRarityWad(n);

function even(n: number): number[] {
  const base = Math.floor(10_000 / n);
  const w = Array.from({ length: n }, () => base);
  w[0] = w[0]! + (10_000 - base * n);
  return w;
}

describe("staticRarityWad — parity with StaticRarityLib.sol reference vectors", () => {
  it("[10000] (n=1) → RARITY_WAD", () => {
    expect(wad([10_000])).toBe(RARITY_WAD);
  });

  it("[5000,5000] → 378947368421052631", () => {
    expect(wad([5000, 5000])).toBe(378_947_368_421_052_631n);
  });

  it("[9000,1000] → 762947368421052631", () => {
    expect(wad([9000, 1000])).toBe(762_947_368_421_052_631n);
  });

  it("20 even → 0", () => {
    expect(wad(even(20))).toBe(0n);
  });

  it("[9981, 1×19] → 597602400000000000", () => {
    expect(wad([9981, ...Array<number>(19).fill(1)])).toBe(
      597_602_400_000_000_000n,
    );
  });

  it("[6000,4000] (the NFFC happy-path vector) → 402947368421052631", () => {
    expect(wad([6000, 4000])).toBe(402_947_368_421_052_631n);
  });
});

describe("staticRarityWad — structure", () => {
  it("more weight concentration is rarer", () => {
    expect(wad([9000, 1000])).toBeGreaterThan(wad([5000, 5000]));
    expect(wad([9999, 1])).toBeGreaterThan(wad([9000, 1000]));
  });

  it("fewer components is rarer (even splits)", () => {
    expect(wad(even(2))).toBeGreaterThan(wad(even(5)));
    expect(wad(even(5))).toBeGreaterThan(wad(even(10)));
    expect(wad(even(10))).toBeGreaterThan(wad(even(20)));
  });

  it("never exceeds RARITY_WAD", () => {
    for (let n = 1; n <= 20; n++)
      expect(wad(even(n))).toBeLessThanOrEqual(RARITY_WAD);
    expect(wad([9999, 1])).toBeLessThanOrEqual(RARITY_WAD);
  });

  it("throws on an empty composition", () => {
    expect(() => wad([])).toThrow(StaticRarityInputError);
  });
});

describe("staticRarityScore", () => {
  it("is the WAD score as a [0, 1] number", () => {
    expect(staticRarityScore([10_000])).toBe(1);
    expect(staticRarityScore(even(20))).toBe(0);
    expect(staticRarityScore([6000, 4000])).toBeCloseTo(0.4029473684, 9);
  });
});

describe("computeStaticRarity", () => {
  it("builds the StaticRarity record from the inputs", () => {
    const inputs: StaticRarityInputs = {
      componentCount: 2,
      weightsBps: [7000, 3000] as unknown as WeightBps[],
    };
    const r = computeStaticRarity(1n as TokenId, inputs);
    expect(r.tokenId).toBe(1n);
    expect(r.inputs).toBe(inputs);
    expect(r.score).toBe(staticRarityScore([7000, 3000]));
  });
});
