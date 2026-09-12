/**
 * The mint step's flow: prepare metadata → simulate → (only then) sign, submit,
 * confirm. TASK-18 acceptance:
 *
 * - **Simulation failures are communicated before a signature is requested.**
 *   `mint()` only calls the underlying wagmi write (`useTransactionFlow`'s
 *   `request`, which is what actually opens the wallet) *after*
 *   `prepareMetadata` and `simulateMint` both resolve. Either one throwing
 *   leaves the transaction state at `"idle"` — by `transactionFlowReducer`'s
 *   own guarantee, `"idle"` is only ever left by calling `request`, so a state
 *   still `"idle"` after `mint()` settles is proof no wallet interaction
 *   happened. `isPreparing` distinguishes "working on it" from "truly idle"
 *   without adding a 9th state to the fixed vocabulary
 *   (`src/lib/wallet/transaction-state.ts`).
 * - **`SUCCESS` is only ever reached after on-chain confirmation** — inherited
 *   unchanged from `transactionFlowReducer` (TASK-16); this hook does not
 *   touch that guarantee.
 */
import { useState } from "react";
import type { useWriteContract } from "wagmi";
import { useTransactionFlow, type UseTransactionFlowResult } from "@/lib/wallet/transaction-flow";
import type { TransactionState } from "@/lib/wallet/transaction-state";
import type { ErrorCode } from "@domain/errors/errors";

type WriteContractParams = Parameters<ReturnType<typeof useWriteContract>["writeContract"]>[0];

export interface UseMintFlowParams {
  readonly prepareMetadata: () => Promise<string>;
  /** Throws (or rejects) on a failed simulation — the failure message is what's shown. */
  readonly simulateMint: (staticMetadataURI: string) => Promise<void>;
  readonly buildMintCall: (staticMetadataURI: string) => WriteContractParams;
}

export interface UseMintFlowResult {
  readonly state: TransactionState;
  readonly isPreparing: boolean;
  /** Raw message — kept for logs, never rendered directly (TASK-33/34). */
  readonly error: string | null;
  /** The unified vocabulary code for `error` — `null` while there is none. */
  readonly errorCode: ErrorCode | null;
  readonly txHash: UseTransactionFlowResult["txHash"];
  readonly mint: () => void;
  readonly reset: () => void;
}

export function useMintFlow({ prepareMetadata, simulateMint, buildMintCall }: UseMintFlowParams): UseMintFlowResult {
  const flow = useTransactionFlow();
  const [isPreparing, setIsPreparing] = useState(false);
  const [prepError, setPrepError] = useState<string | null>(null);

  const mint = (): void => {
    setPrepError(null);
    setIsPreparing(true);
    void (async () => {
      let staticMetadataURI: string;
      try {
        staticMetadataURI = await prepareMetadata();
        await simulateMint(staticMetadataURI);
      } catch (err) {
        setIsPreparing(false);
        setPrepError(err instanceof Error ? err.message : "Failed to prepare the mint.");
        return; // request() is never called — no wallet interaction happens
      }
      setIsPreparing(false);
      flow.request(buildMintCall(staticMetadataURI));
    })();
  };

  return {
    state: flow.state,
    isPreparing,
    error: prepError ?? flow.error,
    // A prepare/simulate failure never reaches transactionFlowReducer (`mint`
    // returns before `flow.request` is ever called) — same reasoning as
    // useWriteFlow's `simulation_failed`, TASK-33/34.
    errorCode: prepError ? "simulation_failed" : flow.errorCode,
    txHash: flow.txHash,
    mint,
    reset: () => {
      setPrepError(null);
      flow.reset();
    },
  };
}
