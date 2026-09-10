import { CheckCircle2, CircleDashed, Loader2, XCircle } from "lucide-react";
import { cn } from "@/lib/cn";
import {
  TRANSACTION_STATE_META,
  type TransactionState,
  type TransactionTone,
} from "@/lib/wallet/transaction-state";

const TONE_ICON: Record<TransactionTone, typeof CircleDashed> = {
  idle: CircleDashed,
  pending: Loader2,
  good: CheckCircle2,
  critical: XCircle,
};

const TONE_CLASS: Record<TransactionTone, string> = {
  idle: "text-subtle-foreground",
  pending: "text-primary",
  good: "text-gain",
  critical: "text-loss",
};

/**
 * Presentational view of the wallet transaction state machine. Icon + label +
 * description — the state reads without colour. Drop-in for the mint / buy /
 * offer flows once TASK-16 provides the live state.
 */
export function TransactionStatus({
  state,
  className,
}: {
  state: TransactionState;
  className?: string;
}) {
  const meta = TRANSACTION_STATE_META[state];
  const Icon = TONE_ICON[meta.tone];

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "flex items-start gap-3 rounded-md border border-border bg-surface p-3",
        className,
      )}
    >
      <Icon
        aria-hidden
        className={cn(
          "mt-0.5 size-4 shrink-0",
          TONE_CLASS[meta.tone],
          meta.tone === "pending" && "animate-spin",
        )}
      />
      <div className="flex flex-col gap-0.5">
        <span className="text-sm font-medium text-foreground">
          {meta.label}
        </span>
        <span className="text-xs text-muted-foreground">
          {meta.description}
        </span>
      </div>
    </div>
  );
}
