// @vitest-environment node
import { type Address, type Hex, stringToHex } from "viem";
import { describe, expect, it, vi } from "vitest";
import { createFakeLogger } from "../../tests/support/fakes";
import { computeRepresentationId } from "./reconcile";
import { fixedTokenSource } from "./source";
import { runProviderSync } from "./sync";
import type { OnChainRepresentation, OracleMeta, ProviderToken } from "./types";

const PID = stringToHex("CRYPTO_NATIVE", { size: 32 });
const CHAIN = 4663n;
const ORACLE: OracleMeta = {
  feed: "0x2222222222222222222222222222222222222222",
  heartbeat: 3600,
  feedDecimals: 8,
};
const A = "0x1111111111111111111111111111111111111111" as Address;
const B = "0x3333333333333333333333333333333333333333" as Address;

function tk(addr: Address): ProviderToken {
  return {
    symbol: "SYM",
    name: "Name",
    token: addr,
    decimals: 18,
    multiplier: 10n ** 18n,
    oracle: ORACLE,
  };
}
function oc(addr: Address, active: boolean): OnChainRepresentation {
  return {
    representationId: computeRepresentationId(PID, CHAIN, addr),
    token: addr,
    active,
    oracle: ORACLE,
  };
}

function deps(overrides: Partial<Parameters<typeof runProviderSync>[0]>) {
  const upsert = vi.fn<(t: ProviderToken) => Promise<void>>(async () => {});
  const deactivate = vi.fn<
    (e: { representationId: Hex; token: Address }) => Promise<void>
  >(async () => {});
  return {
    upsert,
    deactivate,
    base: {
      providerName: "crypto",
      providerId: PID,
      chainId: CHAIN,
      source: fixedTokenSource([]),
      readOnChain: async () => [] as OnChainRepresentation[],
      upsert,
      deactivate,
      now: () => 1_000,
      logger: createFakeLogger(),
      ...overrides,
    },
  };
}

describe("runProviderSync", () => {
  it("registers every provider token on a fresh chain", async () => {
    const { base, upsert, deactivate } = deps({
      source: fixedTokenSource([tk(A), tk(B)]),
    });
    const summary = await runProviderSync(base);
    expect(upsert).toHaveBeenCalledTimes(2);
    expect(deactivate).not.toHaveBeenCalled();
    expect(summary).toMatchObject({
      upserted: 2,
      deactivated: 0,
      unchanged: 0,
      at: 1_000,
    });
  });

  it("deactivates a representation the provider delisted", async () => {
    const { base, upsert, deactivate } = deps({
      source: fixedTokenSource([tk(A)]),
      readOnChain: async () => [oc(A, true), oc(B, true)],
    });
    const summary = await runProviderSync(base);
    expect(upsert).not.toHaveBeenCalled();
    expect(deactivate).toHaveBeenCalledTimes(1);
    expect(deactivate.mock.calls[0]?.[0]?.token).toBe(B);
    expect(summary).toMatchObject({
      upserted: 0,
      deactivated: 1,
      unchanged: 1,
    });
  });

  it("does nothing when on-chain already matches", async () => {
    const { base, upsert, deactivate } = deps({
      source: fixedTokenSource([tk(A)]),
      readOnChain: async () => [oc(A, true)],
    });
    const summary = await runProviderSync(base);
    expect(upsert).not.toHaveBeenCalled();
    expect(deactivate).not.toHaveBeenCalled();
    expect(summary.unchanged).toBe(1);
  });

  it("stops applying once the signal aborts", async () => {
    const controller = new AbortController();
    const { base, upsert } = deps({
      source: fixedTokenSource([tk(A), tk(B)]),
      signal: controller.signal,
    });
    upsert.mockImplementation(async () => {
      controller.abort();
    });
    const summary = await runProviderSync(base);
    expect(upsert).toHaveBeenCalledTimes(1);
    expect(summary.upserted).toBe(1);
  });
});
