/**
 * Buy on the marketplace: simulate → sign → submit → confirm (TASK-20),
 * reusing TASK-16's transaction state machine exactly as TASK-18's mint flow
 * does — see `docs/mint-flow.md` for the general shape this mirrors.
 * `transactionFlowReducer` is untouched: a pre-flight `isSimulating`/`error`
 * pair lives outside it, and `flow.request(...)` — the only thing that can
 * open the wallet — is called only after `simulateBuy` resolves without
 * throwing, so a simulation failure is communicated before a signature is
 * ever requested, the same acceptance property TASK-18 established for mint.
 */
import { useState } from "react";
import type { useWriteContract } from "wagmi";
import { useTransactionFlow, type UseTransactionFlowResult } from "@/lib/wallet/transaction-flow";
import type { TransactionState } from "@/lib/wallet/transaction-state";

type WriteContractParams = Parameters<ReturnType<typeof useWriteContract>["writeContract"]>[0];

export interface UseBuyFlowParams {
  readonly simulateBuy: () => Promise<void>;
  readonly buildBuyCall: () => WriteContractParams;
}

export interface UseBuyFlowResult {
  readonly state: TransactionState;
  readonly isSimulating: boolean;
  readonly error: string | null;
  readonly txHash: UseTransactionFlowResult["txHash"];
  readonly buy: () => void;
  readonly reset: () => void;
}

export function useBuyFlow({ simulateBuy, buildBuyCall }: UseBuyFlowParams): UseBuyFlowResult {
  const flow = useTransactionFlow();
  const [isSimulating, setIsSimulating] = useState(false);
  const [simError, setSimError] = useState<string | null>(null);

  const buy = (): void => {
    setSimError(null);
    setIsSimulating(true);
    void (async () => {
      try {
        await simulateBuy();
      } catch (err) {
        setIsSimulating(false);
        setSimError(err instanceof Error ? err.message : "Failed to simulate the purchase.");
        return; // request() is never called — no wallet interaction happens
      }
      setIsSimulating(false);
      flow.request(buildBuyCall());
    })();
  };

  return {
    state: flow.state,
    isSimulating,
    error: simError ?? flow.error,
    txHash: flow.txHash,
    buy,
    reset: () => {
      setSimError(null);
      flow.reset();
    },
  };
}
