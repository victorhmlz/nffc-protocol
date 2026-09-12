/**
 * Any marketplace write: simulate → sign → submit → confirm — buy (TASK-20),
 * and now create/cancel/accept offer (TASK-29), reusing TASK-16's transaction
 * state machine exactly. Generalized here from TASK-20's `useBuyFlow` (now
 * retired — its "buy"-specific parameter/method names were never actually
 * buy-specific; every marketplace action needs the identical pre-flight
 * simulate/error pair, outside `transactionFlowReducer`, and `flow.request(...)`
 * — the only thing that can open the wallet — called only after `simulate`
 * resolves without throwing. `BuyButton`'s own call site was updated to
 * match, no behavior change.
 */
import { useState } from "react";
import type { useWriteContract } from "wagmi";
import { useTransactionFlow, type UseTransactionFlowResult } from "@/lib/wallet/transaction-flow";
import type { TransactionState } from "@/lib/wallet/transaction-state";

type WriteContractParams = Parameters<ReturnType<typeof useWriteContract>["writeContract"]>[0];

export interface UseMarketplaceActionFlowParams {
  readonly simulate: () => Promise<void>;
  readonly buildCall: () => WriteContractParams;
}

export interface UseMarketplaceActionFlowResult {
  readonly state: TransactionState;
  readonly isSimulating: boolean;
  readonly error: string | null;
  readonly txHash: UseTransactionFlowResult["txHash"];
  readonly execute: () => void;
  readonly reset: () => void;
}

export function useMarketplaceActionFlow({
  simulate,
  buildCall,
}: UseMarketplaceActionFlowParams): UseMarketplaceActionFlowResult {
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
    txHash: flow.txHash,
    execute,
    reset: () => {
      setSimError(null);
      flow.reset();
    },
  };
}
