/**
 * The `PriceOracle` port's contract, as a reusable suite (`docs/conventions.md`
 * §4). Run it against any implementation — `chainlink-price-oracle.test.ts`
 * runs it against both `ChainlinkPriceOracle` and an unrelated in-memory
 * implementation (`createStaticPriceOracle`) — to prove the data contract
 * doesn't secretly depend on which oracle is behind it (TASK-22 acceptance:
 * "design supports adding a second oracle provider without breaking the data
 * contract"). Not a `*.test.*` file itself — imported and invoked from one.
 */
import { describe, expect, it } from "vitest";
import type { PriceOracle } from "@domain/ports/price-oracle";
import type { RepresentationId } from "@domain/registry/types";

export function runPriceOracleContract(
  implementationName: string,
  make: () => { readonly oracle: PriceOracle; readonly representationId: RepresentationId },
): void {
  describe(`PriceOracle contract — ${implementationName}`, () => {
    it("getPrice never omits source or observedAt (acceptance: no price without them)", async () => {
      const { oracle, representationId } = make();
      const price = await oracle.getPrice(representationId);
      expect(price.representationId).toBe(representationId);
      expect(price.source).toBeTruthy();
      expect(price.observedAt).toBeGreaterThan(0);
      expect(Number.isFinite(price.normalized)).toBe(true);
      expect(typeof price.stale).toBe("boolean");
    });

    it("getPrices returns exactly one entry per requested representation, keyed by id", async () => {
      const { oracle, representationId } = make();
      const prices = await oracle.getPrices([representationId]);
      expect(prices.size).toBe(1);
      expect(prices.get(representationId)).toEqual(await oracle.getPrice(representationId));
    });

    it("getPrices on an empty request returns an empty map, not an error", async () => {
      const { oracle } = make();
      const prices = await oracle.getPrices([]);
      expect(prices.size).toBe(0);
    });
  });
}
