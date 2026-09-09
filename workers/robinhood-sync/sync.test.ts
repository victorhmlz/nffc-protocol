// @vitest-environment node
import type { Address, Hex } from "viem";
import { describe, expect, it, vi } from "vitest";
import { createFakeLogger } from "../../tests/support/fakes";
import { computeRobinhoodRepresentationId } from "./reconcile";
import { fixedTokenSource } from "./source";
import { runRobinhoodSync } from "./sync";
import type {
  OnChainRepresentation,
  OracleMeta,
  RobinhoodToken,
} from "./types";

const CHAIN = 4663n;
const ORACLE: OracleMeta = {
  feed: "0x2222222222222222222222222222222222222222",
  heartbeat: 3600,
  feedDecimals: 8,
};
const A = "0x1111111111111111111111111111111111111111" as Address;
const B = "0x3333333333333333333333333333333333333333" as Address;

function tk(addr: Address): RobinhoodToken {
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
    representationId: computeRobinhoodRepresentationId(CHAIN, addr),
    token: addr,
    active,
    oracle: ORACLE,
  };
}

function deps(overrides: Partial<Parameters<typeof runRobinhoodSync>[0]>) {
  const upsert = vi.fn<(t: RobinhoodToken) => Promise<void>>(async () => {});
  const deactivate = vi.fn<
    (e: { representationId: Hex; token: Address }) => Promise<void>
  >(async () => {});
  return {
    upsert,
    deactivate,
    base: {
      source: fixedTokenSource([]),
      chainId: CHAIN,
      readOnChain: async () => [] as OnChainRepresentation[],
      upsert,
      deactivate,
      now: () => 1_000,
      logger: createFakeLogger(),
      ...overrides,
    },
  };
}

describe("runRobinhoodSync", () => {
  it("registers every provider token on a fresh chain", async () => {
    const { base, upsert, deactivate } = deps({
      source: fixedTokenSource([tk(A), tk(B)]),
    });
    const summary = await runRobinhoodSync(base);
    expect(upsert).toHaveBeenCalledTimes(2);
    expect(deactivate).not.toHaveBeenCalled();
    expect(summary).toMatchObject({
      upserted: 2,
      deactivated: 0,
      unchanged: 0,
      at: 1_000,
    });
  });

  it("deactivates a representation Robinhood delisted", async () => {
    const { base, upsert, deactivate } = deps({
      source: fixedTokenSource([tk(A)]),
      readOnChain: async () => [oc(A, true), oc(B, true)],
    });
    const summary = await runRobinhoodSync(base);
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
    const summary = await runRobinhoodSync(base);
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
    const summary = await runRobinhoodSync(base);
    expect(upsert).toHaveBeenCalledTimes(1);
    expect(summary.upserted).toBe(1);
  });
});
