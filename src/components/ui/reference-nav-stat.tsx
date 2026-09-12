import type { MarketDataPoint } from "@domain/metadata/metadata";
import { ERROR_VOCABULARY } from "@domain/errors/errors";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/cn";
import { formatAge } from "@/lib/format-age";

export interface ReferenceNavStatProps {
  /** `null` while unavailable — pair with `unavailableReason`. */
  readonly data: MarketDataPoint | null;
  readonly loading?: boolean;
  readonly unavailableReason?: string;
  /** Injectable "now" (ms) for deterministic age rendering in tests. */
  readonly now?: number;
  readonly className?: string;
}

/**
 * The Reference NAV — always labelled as such, never bare "value"
 * (`docs/spec/07-ux-map.md` §6). Every rendered value carries its oracle
 * `source` and observation age; loading and unavailable states are explicit,
 * never a blank number (TASK-15 acceptance).
 */
export function ReferenceNavStat({
  data,
  loading,
  unavailableReason,
  now,
  className,
}: ReferenceNavStatProps) {
  if (loading) {
    return (
      <div
        className={cn("flex flex-col gap-2", className)}
        aria-busy="true"
        aria-live="polite"
      >
        <span className="text-xs font-medium text-subtle-foreground">
          Reference NAV
        </span>
        <Skeleton className="h-8 w-28" />
        <Skeleton className="h-3.5 w-36" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className={cn("flex flex-col gap-1", className)} role="status">
        <span className="text-xs font-medium text-subtle-foreground">
          Reference NAV
        </span>
        <span className="text-sm text-muted-foreground">
          {unavailableReason ?? "Reference NAV is not available yet."}
        </span>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <span className="text-xs font-medium text-subtle-foreground">
        Reference NAV
      </span>
      <span className="text-2xl font-semibold tracking-tight tabular-nums">
        $
        {data.value.toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}
      </span>
      <span className="flex flex-wrap items-center gap-1.5 text-xs text-subtle-foreground">
        <span>{data.source}</span>
        <span aria-hidden>·</span>
        <span>{formatAge(data.observedAt, now)}</span>
        {data.stale && (
          <Badge variant="warning" title={ERROR_VOCABULARY.oracle_stale.recoveryAction}>
            Stale
          </Badge>
        )}
      </span>
    </div>
  );
}
