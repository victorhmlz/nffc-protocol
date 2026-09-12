/**
 * Transitions for the wallet transaction state machine
 * (`src/lib/wallet/transaction-state.ts`, `docs/spec/07-ux-map.md` §3). TASK-16
 * acceptance: "no state is skipped — there is no direct SIGNING to SUCCESS
 * transition." {@link transactionFlowReducer} is a total lookup-table reducer:
 * every event names the exact state(s) it may fire from, so a caller can only
 * ever advance one step at a time — a skip throws {@link SkippedTransactionStateError}
 * rather than silently landing on the wrong state.
 *
 * The pure reducer is fully unit-tested; {@link useTransactionFlow} is thin
 * wagmi glue driving it from `useWriteContract` / `useWaitForTransactionReceipt`.
 */
import { useEffect, useReducer, useState } from "react";
import { useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import type { TransactionState } from "@/lib/wallet/transaction-state";
import { classifyWalletError } from "@/lib/wallet/classify-wallet-error";
import type { ErrorCode } from "@domain/errors/errors";

export type TransactionEvent =
  | { readonly type: "RESET" }
  | { readonly type: "REQUEST_WALLET" }
  | { readonly type: "SIGN" }
  | { readonly type: "SUBMIT"; readonly txHash: `0x${string}` }
  | { readonly type: "CONFIRM" }
  | { readonly type: "SUCCEED" }
  | { readonly type: "REJECT" }
  | { readonly type: "FAIL"; readonly error: string };

export class SkippedTransactionStateError extends Error {
  override name = "SkippedTransactionStateError";
  constructor(eventType: TransactionEvent["type"], from: TransactionState) {
    super(
      `Cannot dispatch "${eventType}" from transaction state "${from}" — no state may be skipped.`,
    );
  }
}

interface Transition {
  readonly from: readonly TransactionState[];
  readonly to: TransactionState;
}

const TRANSITIONS: Record<TransactionEvent["type"], Transition> = {
  RESET: { from: ["idle", "success", "failed", "rejected"], to: "idle" },
  REQUEST_WALLET: { from: ["idle"], to: "awaiting_wallet" },
  SIGN: { from: ["awaiting_wallet"], to: "signing" },
  SUBMIT: { from: ["signing"], to: "submitted" },
  CONFIRM: { from: ["submitted"], to: "confirming" },
  SUCCEED: { from: ["confirming"], to: "success" },
  REJECT: { from: ["awaiting_wallet", "signing"], to: "rejected" },
  FAIL: {
    from: ["awaiting_wallet", "signing", "submitted", "confirming"],
    to: "failed",
  },
};

export function transactionFlowReducer(
  state: TransactionState,
  event: TransactionEvent,
): TransactionState {
  const transition = TRANSITIONS[event.type];
  if (!transition.from.includes(state)) {
    throw new SkippedTransactionStateError(event.type, state);
  }
  return transition.to;
}

export interface UseTransactionFlowResult {
  readonly state: TransactionState;
  /** Raw wagmi/viem message — kept for logs, never rendered directly (TASK-33). */
  readonly error: string | null;
  /** The unified vocabulary code for `error` — `null` outside "rejected"/"failed". */
  readonly errorCode: ErrorCode | null;
  readonly txHash: `0x${string}` | undefined;
  /** Same signature as wagmi's `writeContract` — call it to start the flow. */
  readonly request: ReturnType<typeof useWriteContract>["writeContract"];
  readonly reset: () => void;
}

/**
 * Drives {@link transactionFlowReducer} from a real wagmi write + receipt wait.
 * `request` maps to `REQUEST_WALLET` immediately followed by `SIGN`: wagmi does
 * not distinguish "wallet opening" from "awaiting signature" as separate
 * events, and both precede the user's actual approval, matching the state
 * machine's own descriptions (`transaction-state.ts`).
 */
export function useTransactionFlow(): UseTransactionFlowResult {
  const [state, dispatch] = useReducer(transactionFlowReducer, "idle");
  // Set only from the mutation's onError callback (a react-query lifecycle
  // callback, not a render-phase effect) — never from inside a `useEffect`.
  const [writeError, setWriteError] = useState<string | null>(null);

  const { writeContract, data: txHash } = useWriteContract({
    mutation: {
      onMutate: () => {
        dispatch({ type: "REQUEST_WALLET" });
        dispatch({ type: "SIGN" });
      },
      onSuccess: (hash) => dispatch({ type: "SUBMIT", txHash: hash }),
      onError: (err) => {
        const rejected = /user rejected|user denied/i.test(err.message);
        setWriteError(err.message);
        dispatch(
          rejected ? { type: "REJECT" } : { type: "FAIL", error: err.message },
        );
      },
    },
  });

  const receipt = useWaitForTransactionReceipt({
    hash: txHash,
    query: { enabled: state === "submitted" || state === "confirming" },
  });

  useEffect(() => {
    if (state === "submitted" && receipt.fetchStatus === "fetching") {
      dispatch({ type: "CONFIRM" });
    }
  }, [state, receipt.fetchStatus]);

  useEffect(() => {
    if (state !== "confirming") return;
    if (receipt.isSuccess) dispatch({ type: "SUCCEED" });
    else if (receipt.isError) {
      dispatch({
        type: "FAIL",
        error: receipt.error?.message ?? "Transaction failed",
      });
    }
  }, [state, receipt.isSuccess, receipt.isError, receipt.error]);

  // The receipt itself already carries its own error for display — no extra
  // state needed for that branch.
  const error =
    writeError ??
    (state === "failed" && receipt.isError
      ? (receipt.error?.message ?? "Transaction failed")
      : null);

  const errorCode: ErrorCode | null =
    state === "rejected" || state === "failed" ? classifyWalletError(state, error) : null;

  return {
    state,
    error,
    errorCode,
    txHash,
    request: writeContract,
    reset: () => {
      setWriteError(null);
      dispatch({ type: "RESET" });
    },
  };
}
