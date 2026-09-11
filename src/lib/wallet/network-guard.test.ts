import { describe, expect, it } from "vitest";
import { deriveNetworkGuardState } from "@/lib/wallet/network-guard";

describe("deriveNetworkGuardState", () => {
  it("is not wrong when no wallet is connected (currentChainId null)", () => {
    expect(deriveNetworkGuardState(null, 4663)).toEqual({
      currentChainId: null,
      targetChainId: 4663,
      isWrongNetwork: false,
    });
  });

  it("is not wrong when connected to the target chain", () => {
    expect(deriveNetworkGuardState(4663, 4663).isWrongNetwork).toBe(false);
  });

  it("is wrong when connected to a different chain", () => {
    expect(deriveNetworkGuardState(1, 4663).isWrongNetwork).toBe(true);
  });

  it("reports the current and target chain ids unchanged", () => {
    const s = deriveNetworkGuardState(137, 4663);
    expect(s.currentChainId).toBe(137);
    expect(s.targetChainId).toBe(4663);
  });
});
