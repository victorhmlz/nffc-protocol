import { describe, expect, it } from "vitest";
import { keccak256, pad, stringToHex } from "viem";
import type { AssetId, RepresentationId } from "@domain/registry/types";
import {
  computeCompositionHash,
  type HashableComponent,
} from "@/lib/wizard/composition-hash";

function assetId(s: string): AssetId {
  return keccak256(stringToHex(s)) as AssetId;
}
function repId(s: string): RepresentationId {
  return pad(stringToHex(s)) as unknown as RepresentationId;
}

const NVDA = assetId("NVDA");
const BTC = assetId("BTC");
const NVDA_REP = repId("nvdarep");
const BTC_REP = repId("btcrep");

function comps(
  overrides: Partial<HashableComponent>[] = [],
): HashableComponent[] {
  const base: HashableComponent[] = [
    { assetId: NVDA, representationId: NVDA_REP, weightBps: 6000 },
    { assetId: BTC, representationId: BTC_REP, weightBps: 4000 },
  ];
  return overrides.length ? (overrides as HashableComponent[]) : base;
}

describe("computeCompositionHash", () => {
  it("returns a 32-byte hex hash", () => {
    const hash = computeCompositionHash(comps());
    expect(hash).toMatch(/^0x[0-9a-f]{64}$/);
  });

  it("is deterministic — same components, same hash", () => {
    expect(computeCompositionHash(comps())).toBe(
      computeCompositionHash(comps()),
    );
  });

  it("changes when a weight changes", () => {
    const a = computeCompositionHash(comps());
    const b = computeCompositionHash([
      { assetId: NVDA, representationId: NVDA_REP, weightBps: 5999 },
      { assetId: BTC, representationId: BTC_REP, weightBps: 4001 },
    ]);
    expect(a).not.toBe(b);
  });

  it("changes when the order changes", () => {
    const a = computeCompositionHash(comps());
    const b = computeCompositionHash([
      { assetId: BTC, representationId: BTC_REP, weightBps: 4000 },
      { assetId: NVDA, representationId: NVDA_REP, weightBps: 6000 },
    ]);
    expect(a).not.toBe(b);
  });

  it("changes when an asset changes", () => {
    const a = computeCompositionHash(comps());
    const aapl = assetId("AAPL");
    const b = computeCompositionHash([
      { assetId: aapl, representationId: NVDA_REP, weightBps: 6000 },
      { assetId: BTC, representationId: BTC_REP, weightBps: 4000 },
    ]);
    expect(a).not.toBe(b);
  });

  it("handles a single component", () => {
    const hash = computeCompositionHash([
      { assetId: NVDA, representationId: NVDA_REP, weightBps: 10_000 },
    ]);
    expect(hash).toMatch(/^0x[0-9a-f]{64}$/);
  });
});
