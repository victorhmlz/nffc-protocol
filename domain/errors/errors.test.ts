import { describe, expect, it } from "vitest";
import { ERROR_VOCABULARY, type ErrorCode } from "@domain/errors/errors";

const ALL_CODES: readonly ErrorCode[] = [
  "wallet_rejected",
  "insufficient_funds",
  "wrong_network",
  "transaction_reverted",
  "simulation_failed",
  "rpc_unavailable",
  "indexer_lag",
  "api_unavailable",
  "oracle_stale",
];

describe("ERROR_VOCABULARY", () => {
  it("defines exactly the nine categories seeded in docs/spec/07-ux-map.md §7", () => {
    expect(Object.keys(ERROR_VOCABULARY).sort()).toEqual([...ALL_CODES].sort());
  });

  it("gives every code a non-empty message and recovery action", () => {
    for (const code of ALL_CODES) {
      const entry = ERROR_VOCABULARY[code];
      expect(entry.message.length).toBeGreaterThan(0);
      expect(entry.recoveryAction.length).toBeGreaterThan(0);
      expect(["critical", "warning"]).toContain(entry.tone);
    }
  });

  it("never repeats the same message across two different codes", () => {
    const messages = ALL_CODES.map((code) => ERROR_VOCABULARY[code].message);
    expect(new Set(messages).size).toBe(messages.length);
  });

  it("marks the two data-still-shown categories as warning, not critical", () => {
    expect(ERROR_VOCABULARY.oracle_stale.tone).toBe("warning");
    expect(ERROR_VOCABULARY.indexer_lag.tone).toBe("warning");
  });
});
