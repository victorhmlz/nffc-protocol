import { Button } from "@/components/ui/button";
import { TransactionStatus } from "@/components/ui/transaction-status";
import type { TransactionState } from "@/lib/wallet/transaction-state";

export interface StepMintProps {
  readonly state: TransactionState;
  /** True while generating the art + mint-condition trait and simulating —
   *  before any wallet interaction (TASK-18). */
  readonly isPreparing: boolean;
  readonly error: string | null;
  readonly onMint: () => void;
}

/**
 * Prepare (art + mint-condition, TASK-12/13) → simulate → sign → submit →
 * confirm, driven by TASK-16's transaction state machine — never a bare
 * "minting…" spinner. A simulation failure surfaces here, as `error`, while
 * `state` is still `"idle"` — no signature was ever requested (TASK-18
 * acceptance). The caller owns the actual contract call (`useMintFlow`); this
 * step only renders it.
 */
export function StepMint({ state, isPreparing, error, onMint }: StepMintProps) {
  return (
    <div className="flex flex-col gap-4">
      {isPreparing ? (
        <p role="status" aria-live="polite" className="text-sm text-muted-foreground">
          Preparing — generating the art and market-condition snapshot, then simulating the mint…
        </p>
      ) : (
        <TransactionStatus state={state} />
      )}
      {error && (
        <p role="alert" className="text-sm text-loss">
          {error}
        </p>
      )}
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
