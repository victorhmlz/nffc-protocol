import { describe, expect, it } from "vitest";
import { BPS_TOTAL } from "@domain/nffc/composition";
import { ROBINHOOD_CHAIN } from "@config/chain";
import { createProviderAdapterRegistry } from "@adapters/provider-adapter-registry";

/**
 * TASK-02 cross-module wiring: domain / config / adapters compile, resolve
 * through their path aliases, and compose. No behaviour under test yet.
 * (Lives in `tests/` per docs/conventions.md §4 — it crosses module
 * boundaries that `domain/`-local tests are not allowed to.)
 */
describe("architecture foundation", () => {
  it("re-exports domain constants through the alias", () => {
    expect(BPS_TOTAL).toBe(10_000);
  });

  it("carries the first network's fixed facts from config", () => {
    expect(ROBINHOOD_CHAIN.chainId).toBe(4663);
    expect(ROBINHOOD_CHAIN.nativeGasSymbol).toBe("ETH");
  });

  it("composes an empty provider-adapter registry (adapters land in TASK-06/07)", () => {
    const registry = createProviderAdapterRegistry();
    expect(registry.list()).toHaveLength(0);
  });
});
