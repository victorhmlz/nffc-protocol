/**
 * Any on-chain write that needs a wallet signature: simulate → sign → submit
 * → confirm, reusing TASK-16's transaction state machine exactly. Originally
 * TASK-20's `useBuyFlow`, generalized to `useMarketplaceActionFlow` in
 * TASK-29 when offers needed the identical shape, and relocated/renamed here
 * in TASK-31 when admin writes (register an asset, set a fee, activate a
 * representation — none of them "marketplace" actions) needed it too. The
 * behavior has never changed across any of these moves — only the name and
 * home ever catch up to how many callers actually need it.
 *
 * A pre-flight `simulate`/error pair lives outside `transactionFlowReducer`
 * (unmodified, again), so a simulation failure surfaces before any signature
 * is requested — the same acceptance property TASK-18 established for mint,
 * reused rather than re-derived every time a new write flow is added.
 */
import { useState } from "react";
import type { useWriteContract } from "wagmi";
import { useTransactionFlow, type UseTransactionFlowResult } from "@/lib/wallet/transaction-flow";
import type { TransactionState } from "@/lib/wallet/transaction-state";
import type { ErrorCode } from "@domain/errors/errors";

type WriteContractParams = Parameters<ReturnType<typeof useWriteContract>["writeContract"]>[0];

export interface UseWriteFlowParams {
  readonly simulate: () => Promise<void>;
  readonly buildCall: () => WriteContractParams;
}

export interface UseWriteFlowResult {
  readonly state: TransactionState;
  readonly isSimulating: boolean;
  /** Raw message — kept for logs, never rendered directly (TASK-33). */
  readonly error: string | null;
  /** The unified vocabulary code for `error` — `null` while there is none. */
  readonly errorCode: ErrorCode | null;
  readonly txHash: UseTransactionFlowResult["txHash"];
  readonly execute: () => void;
  readonly reset: () => void;
}

export function useWriteFlow({ simulate, buildCall }: UseWriteFlowParams): UseWriteFlowResult {
  const flow = useTransactionFlow();
  const [isSimulating, setIsSimulating] = useState(false);
  const [simError, setSimError] = useState<string | null>(null);

  const execute = (): void => {
    setSimError(null);
    setIsSimulating(true);
    void (async () => {
      try {
        await simulate();
      } catch (err) {
        setIsSimulating(false);
        setSimError(err instanceof Error ? err.message : "Failed to simulate the transaction.");
        return; // request() is never called — no wallet interaction happens
      }
      setIsSimulating(false);
      flow.request(buildCall());
    })();
  };

  return {
    state: flow.state,
    isSimulating,
    error: simError ?? flow.error,
    // A simulation failure never reaches transactionFlowReducer (`execute`
    // returns before `flow.request` is ever called) — it always gets its own
    // code rather than falling through to `flow.errorCode` (`null`, since the
    // flow never left "idle").
    errorCode: simError ? "simulation_failed" : flow.errorCode,
    txHash: flow.txHash,
    execute,
    reset: () => {
      setSimError(null);
      flow.reset();
    },
  };
}
