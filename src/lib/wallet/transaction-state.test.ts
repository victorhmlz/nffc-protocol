import { describe, expect, it } from "vitest";
import {
  TRANSACTION_STATE_META,
  type TransactionState,
  isTerminal,
} from "@/lib/wallet/transaction-state";

const ALL: TransactionState[] = [
  "idle",
  "awaiting_wallet",
  "signing",
  "submitted",
  "confirming",
  "success",
  "failed",
  "rejected",
];

describe("transaction state", () => {
  it("has metadata for every state", () => {
    for (const state of ALL) {
      const meta = TRANSACTION_STATE_META[state];
      expect(meta.label.length).toBeGreaterThan(0);
      expect(meta.description.length).toBeGreaterThan(0);
    }
  });

  it("marks only success / failed / rejected as terminal", () => {
    expect(ALL.filter(isTerminal)).toEqual(["success", "failed", "rejected"]);
  });

  it("never puts a terminal 'good' tone on a non-success state", () => {
    for (const state of ALL) {
      if (TRANSACTION_STATE_META[state].tone === "good") {
        expect(state).toBe("success");
      }
    }
  });
});
