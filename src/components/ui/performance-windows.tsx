import type { PerformancePoint } from "@domain/valuation/types";
import { Skeleton } from "@/components/ui/skeleton";
import { Stat } from "@/components/ui/stat";
import { cn } from "@/lib/cn";
import { formatAge } from "@/lib/format-age";

export interface PerformanceWindowsProps {
  /** `null` / empty while unavailable — the Price/NAV Engine isn't wired yet. */
  readonly points: readonly PerformancePoint[] | null;
  readonly loading?: boolean;
  readonly now?: number;
  readonly className?: string;
}

const WINDOW_LABEL: Record<PerformancePoint["window"], string> = {
  "1D": "1D",
  "7D": "7D",
  "30D": "30D",
  SINCE_MINT: "Since mint",
};

function formatPct(change: number): string {
  const pct = (change * 100).toFixed(1);
  return change > 0 ? `+${pct}%` : `${pct}%`;
}

/**
 * 1D / 7D / 30D / since-mint performance, each with a visible provenance
 * timestamp (the window's `to.at`) and an explicit loading/unavailable state
 * (`docs/spec/07-ux-map.md` §6; TASK-15 acceptance).
 */
export function PerformanceWindows({
  points,
  loading,
  now,
  className,
}: PerformanceWindowsProps) {
  if (loading) {
    return (
      <div
        className={cn("grid grid-cols-2 gap-4 sm:grid-cols-4", className)}
        aria-busy="true"
        aria-live="polite"
      >
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-14 w-full" />
        ))}
      </div>
    );
  }

  if (!points || points.length === 0) {
    return (
      <p
        className={cn("text-sm text-muted-foreground", className)}
        role="status"
      >
        Performance is not available yet.
      </p>
    );
  }

  return (
    <div className={cn("grid grid-cols-2 gap-4 sm:grid-cols-4", className)}>
      {points.map((p) => (
        <Stat
          key={p.window}
          label={WINDOW_LABEL[p.window]}
          value={`$${p.to.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          delta={{
            label: formatPct(p.change),
            direction: p.change > 0 ? "up" : p.change < 0 ? "down" : "flat",
          }}
          hint={formatAge(p.to.at, now)}
          aligned
        />
      ))}
    </div>
  );
}
