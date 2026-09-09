import { describe, expect, it } from "vitest";
import type { ChainReader } from "@domain/ports";

/**
 * Behaviour every `ChainReader` implementation must satisfy. Run it against the
 * fake here; run it against the viem implementation from an integration context
 * (a testnet or an anvil fork) when TASK-24 / TASK-31 need that assurance.
 */
export function runChainReaderContract(
  name: string,
  make: () => ChainReader | Promise<ChainReader>,
): void {
  describe(`ChainReader contract: ${name}`, () => {
    it("exposes the chain id it reads", async () => {
      const reader = await make();
      expect(typeof reader.chainId).toBe("number");
      expect(reader.chainId).toBeGreaterThan(0);
    });

    it("returns a bigint block number", async () => {
      const reader = await make();
      const bn = await reader.getBlockNumber();
      expect(typeof bn).toBe("bigint");
      expect(bn).toBeGreaterThanOrEqual(0n);
    });
  });
}
