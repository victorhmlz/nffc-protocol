import { describe, expect, it } from "vitest";
import {
  SkippedTransactionStateError,
  transactionFlowReducer,
  type TransactionEvent,
} from "@/lib/wallet/transaction-flow";
import type { TransactionState } from "@/lib/wallet/transaction-state";

const HASH = "0xabc" as const;

describe("transactionFlowReducer — the full happy path, one step at a time", () => {
  it("idle -> awaiting_wallet -> signing -> submitted -> confirming -> success", () => {
    let state: TransactionState = "idle";
    state = transactionFlowReducer(state, { type: "REQUEST_WALLET" });
    expect(state).toBe("awaiting_wallet");
    state = transactionFlowReducer(state, { type: "SIGN" });
    expect(state).toBe("signing");
    state = transactionFlowReducer(state, { type: "SUBMIT", txHash: HASH });
    expect(state).toBe("submitted");
    state = transactionFlowReducer(state, { type: "CONFIRM" });
    expect(state).toBe("confirming");
    state = transactionFlowReducer(state, { type: "SUCCEED" });
    expect(state).toBe("success");
  });
});

describe("transactionFlowReducer — no state may be skipped (TASK-16 acceptance)", () => {
  const cases: { from: TransactionState; event: TransactionEvent }[] = [
    { from: "idle", event: { type: "SIGN" } },
    { from: "idle", event: { type: "SUBMIT", txHash: HASH } },
    { from: "idle", event: { type: "CONFIRM" } },
    { from: "idle", event: { type: "SUCCEED" } },
    { from: "awaiting_wallet", event: { type: "SUBMIT", txHash: HASH } },
    { from: "signing", event: { type: "CONFIRM" } },
    { from: "submitted", event: { type: "SUCCEED" } },
    // the literal acceptance example: SIGNING straight to SUCCESS
    { from: "signing", event: { type: "SUCCEED" } },
  ];

  it.each(cases)("rejects $event.type from $from", ({ from, event }) => {
    expect(() => transactionFlowReducer(from, event)).toThrow(
      SkippedTransactionStateError,
    );
  });

  it("never returns a different state than the one requested when it throws", () => {
    try {
      transactionFlowReducer("signing", { type: "SUCCEED" });
      expect.unreachable();
    } catch (e) {
      expect(e).toBeInstanceOf(SkippedTransactionStateError);
      expect((e as Error).message).toMatch(/SUCCEED.*signing/);
    }
  });
});

describe("transactionFlowReducer — terminal / side transitions", () => {
  it("REJECT only from awaiting_wallet or signing", () => {
    expect(transactionFlowReducer("awaiting_wallet", { type: "REJECT" })).toBe(
      "rejected",
    );
    expect(transactionFlowReducer("signing", { type: "REJECT" })).toBe(
      "rejected",
    );
    expect(() =>
      transactionFlowReducer("submitted", { type: "REJECT" }),
    ).toThrow(SkippedTransactionStateError);
  });

  it("FAIL from any non-terminal state", () => {
    for (const s of [
      "awaiting_wallet",
      "signing",
      "submitted",
      "confirming",
    ] as const) {
      expect(transactionFlowReducer(s, { type: "FAIL", error: "boom" })).toBe(
        "failed",
      );
    }
    expect(() =>
      transactionFlowReducer("idle", { type: "FAIL", error: "boom" }),
    ).toThrow(SkippedTransactionStateError);
  });

  it("RESET from a terminal state (or idle) back to idle", () => {
    for (const s of ["idle", "success", "failed", "rejected"] as const) {
      expect(transactionFlowReducer(s, { type: "RESET" })).toBe("idle");
    }
    expect(() => transactionFlowReducer("signing", { type: "RESET" })).toThrow(
      SkippedTransactionStateError,
    );
  });
});
