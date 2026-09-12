import { Button } from "@/components/ui/button";
import { ErrorNotice } from "@/components/ui/error-notice";
import { TransactionStatus } from "@/components/ui/transaction-status";
import type { TransactionState } from "@/lib/wallet/transaction-state";
import type { ErrorCode } from "@domain/errors/errors";

export interface StepMintProps {
  readonly state: TransactionState;
  /** True while generating the art + mint-condition trait and simulating —
   *  before any wallet interaction (TASK-18). */
  readonly isPreparing: boolean;
  readonly errorCode: ErrorCode | null;
  readonly onMint: () => void;
}

/**
 * Prepare (art + mint-condition, TASK-12/13) → simulate → sign → submit →
 * confirm, driven by TASK-16's transaction state machine — never a bare
 * "minting…" spinner. A simulation failure surfaces here, as `errorCode`,
 * while `state` is still `"idle"` — no signature was ever requested (TASK-18
 * acceptance). The caller owns the actual contract call (`useMintFlow`); this
 * step only renders it. Found during TASK-34's UI audit: this step predates
 * TASK-33's unified error vocabulary (`useMintFlow` was never folded into
 * `useWriteFlow`'s lineage, since it does the extra `prepareMetadata` step)
 * and was still rendering a raw exception message — fixed here to use
 * `ErrorNotice`, the same vetted vocabulary every other write surface uses.
 */
export function StepMint({ state, isPreparing, errorCode, onMint }: StepMintProps) {
  return (
    <div className="flex flex-col gap-4">
      {isPreparing ? (
        <p role="status" aria-live="polite" className="text-sm text-muted-foreground">
          Preparing — generating the art and market-condition snapshot, then simulating the mint…
        </p>
      ) : (
        <TransactionStatus state={state} />
      )}
      {errorCode && <ErrorNotice code={errorCode} />}
      <Button
        type="button"
        onClick={onMint}
        disabled={isPreparing || (state !== "idle" && state !== "failed" && state !== "rejected")}
      >
        Mint
      </Button>
    </div>
  );
}
