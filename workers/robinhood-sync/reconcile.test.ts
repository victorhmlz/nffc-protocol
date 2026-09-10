// @vitest-environment node
import type { Address } from "viem";
import { describe, expect, it } from "vitest";
import { computeRobinhoodRepresentationId, reconcile } from "./reconcile";
import type {
  OnChainRepresentation,
  OracleMeta,
  RobinhoodToken,
} from "./types";

const CHAIN = 4663n;
const ORACLE_A: OracleMeta = {
  feed: "0x2222222222222222222222222222222222222222",
  heartbeat: 3600,
  feedDecimals: 8,
};
const ORACLE_B: OracleMeta = {
  ...ORACLE_A,
  feed: "0x9999999999999999999999999999999999999999",
};

function token(addr: string, oracle: OracleMeta = ORACLE_A): RobinhoodToken {
  return {
    symbol: "SYM",
    name: "Name",
    token: addr as Address,
    decimals: 18,
    multiplier: 10n ** 18n,
    oracle,
  };
}

function onChain(
  addr: string,
  active: boolean,
  oracle: OracleMeta = ORACLE_A,
): OnChainRepresentation {
  return {
    representationId: computeRobinhoodRepresentationId(CHAIN, addr as Address),
    token: addr as Address,
    active,
    oracle,
  };
}

const A = "0x1111111111111111111111111111111111111111";
const B = "0x3333333333333333333333333333333333333333";

describe("computeRobinhoodRepresentationId", () => {
  it("is a deterministic 32-byte hash", () => {
    const id = computeRobinhoodRepresentationId(CHAIN, A as Address);
    expect(id).toMatch(/^0x[0-9a-f]{64}$/);
    expect(computeRobinhoodRepresentationId(CHAIN, A as Address)).toBe(id);
    expect(computeRobinhoodRepresentationId(CHAIN, B as Address)).not.toBe(id);
    expect(computeRobinhoodRepresentationId(1n, A as Address)).not.toBe(id);
  });
});

describe("reconcile", () => {
  it("registers every provider token when nothing is on-chain", () => {
    const plan = reconcile([], [token(A), token(B)], CHAIN);
    expect(plan.toUpsert).toHaveLength(2);
    expect(plan.toDeactivate).toHaveLength(0);
    expect(plan.unchanged).toBe(0);
  });

  it("is a no-op when on-chain matches the provider list", () => {
    const plan = reconcile(
      [onChain(A, true), onChain(B, true)],
      [token(A), token(B)],
      CHAIN,
    );
    expect(plan.toUpsert).toHaveLength(0);
    expect(plan.toDeactivate).toHaveLength(0);
    expect(plan.unchanged).toBe(2);
  });

  it("upserts a token whose on-chain oracle metadata drifted", () => {
    const plan = reconcile(
      [onChain(A, true, ORACLE_A)],
      [token(A, ORACLE_B)],
      CHAIN,
    );
    expect(plan.toUpsert.map((t) => t.token)).toEqual([A]);
    expect(plan.unchanged).toBe(0);
  });

  it("re-activates a token that was inactive but is back in the list", () => {
    const plan = reconcile([onChain(A, false)], [token(A)], CHAIN);
    expect(plan.toUpsert.map((t) => t.token)).toEqual([A]);
    expect(plan.toDeactivate).toHaveLength(0);
  });

  it("deactivates an active on-chain representation Robinhood delisted", () => {
    const plan = reconcile(
      [onChain(A, true), onChain(B, true)],
      [token(A)],
      CHAIN,
    );
    expect(plan.toDeactivate.map((d) => d.token)).toEqual([B]);
    expect(plan.toUpsert).toHaveLength(0);
    expect(plan.unchanged).toBe(1);
  });

  it("leaves an already-inactive delisted representation alone", () => {
    const plan = reconcile([onChain(B, false)], [], CHAIN);
    expect(plan.toDeactivate).toHaveLength(0);
    expect(plan.toUpsert).toHaveLength(0);
  });
});
