import { formatEther } from "viem";
import { Button } from "@/components/ui/button";
import type { FeeQuote } from "@/lib/wizard/types";

export interface StepFeesProps {
  readonly quote: FeeQuote;
  readonly onAcknowledge: () => void;
  readonly onNext: () => void;
}

function eth(wei: bigint | null): string {
  return wei === null ? "—" : `${formatEther(wei)} ETH`;
}

/** The full fee total, shown before the Mint step is reachable at all —
 *  structurally, not just visually (`wizardReducer`'s `fees → mint` gate). */
export function StepFees({ quote, onAcknowledge, onNext }: StepFeesProps) {
  return (
    <div className="flex flex-col gap-4">
      <dl className="flex flex-col gap-2 rounded-md border border-border bg-surface p-4 text-sm">
        {quote.collectionCreationFeeWei !== null && (
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Collection creation fee</dt>
            <dd className="font-mono tabular-nums">
              {eth(quote.collectionCreationFeeWei)}
            </dd>
          </div>
        )}
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Mint fee</dt>
          <dd className="font-mono tabular-nums">{eth(quote.mintFeeWei)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Estimated gas</dt>
          <dd className="font-mono tabular-nums">
            {eth(quote.gasEstimateWei)}
          </dd>
        </div>
        <div className="flex justify-between border-t border-border pt-2 font-semibold">
          <dt>Total</dt>
          <dd className="font-mono tabular-nums">{eth(quote.totalWei)}</dd>
        </div>
      </dl>
      <Button
        type="button"
        onClick={() => {
          onAcknowledge();
          onNext();
        }}
        className="self-start"
      >
        Continue to mint
      </Button>
    </div>
  );
}
