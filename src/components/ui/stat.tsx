import type { ReactNode } from "react";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { cn } from "@/lib/cn";

interface StatDelta {
  /** Pre-formatted, e.g. "+4.2%" or "−$1,204". */
  label: string;
  direction: "up" | "down" | "flat";
  /** Whether "up" is good. Reference NAV: yes. Fees owed: no. */
  goodWhen?: "up" | "down";
}

interface StatProps {
  label: ReactNode;
  value: ReactNode;
  delta?: StatDelta;
  hint?: ReactNode;
  /** Use in a row of stats that must align vertically. */
  aligned?: boolean;
  className?: string;
}

const DELTA_ICON = {
  up: ArrowUpRight,
  down: ArrowDownRight,
  flat: Minus,
} as const;

/**
 * A single KPI. The delta always carries an arrow + text label, so its meaning
 * survives without colour (data-viz status rule).
 */
export function Stat({
  label,
  value,
  delta,
  hint,
  aligned,
  className,
}: StatProps) {
  let tone: "gain" | "loss" | "muted" = "muted";
  if (delta && delta.direction !== "flat") {
    const good = (delta.goodWhen ?? "up") === delta.direction;
    tone = good ? "gain" : "loss";
  }
  const DeltaIcon = delta ? DELTA_ICON[delta.direction] : null;

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <span className="text-xs font-medium text-subtle-foreground">
        {label}
      </span>
      <span
        className={cn(
          "text-2xl font-semibold tracking-tight",
          aligned && "font-mono tabular-nums",
        )}
      >
        {value}
      </span>
      {delta && DeltaIcon && (
        <span
          className={cn(
            "inline-flex items-center gap-1 text-xs font-medium",
            tone === "gain" && "text-gain",
            tone === "loss" && "text-loss",
            tone === "muted" && "text-muted-foreground",
          )}
        >
          <DeltaIcon className="size-3.5" aria-hidden />
          {delta.label}
        </span>
      )}
      {hint && <span className="text-xs text-subtle-foreground">{hint}</span>}
    </div>
  );
}
