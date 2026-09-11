import { Button } from "@/components/ui/button";
import { TransactionStatus } from "@/components/ui/transaction-status";
import type { TransactionState } from "@/lib/wallet/transaction-state";

export interface StepMintProps {
  readonly state: TransactionState;
  readonly error: string | null;
  readonly onMint: () => void;
}

/**
 * Simulate → sign → submit → confirm, driven by TASK-16's transaction state
 * machine — never a bare "minting…" spinner. The caller owns the actual
 * contract call (`useTransactionFlow`, TASK-16); this step only renders it.
 */
export function StepMint({ state, error, onMint }: StepMintProps) {
  return (
    <div className="flex flex-col gap-4">
      <TransactionStatus state={state} />
      {error && (
        <p role="alert" className="text-sm text-loss">
          {error}
        </p>
      )}
      <Button
        type="button"
        onClick={onMint}
        disabled={
          state !== "idle" && state !== "failed" && state !== "rejected"
        }
      >
        Mint
      </Button>
    </div>
  );
}
