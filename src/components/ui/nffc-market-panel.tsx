import type { NffcMarketSnapshot } from "@domain/metadata/metadata";
import { Badge } from "@/components/ui/badge";
import { PerformanceWindows } from "@/components/ui/performance-windows";
import { ReferenceNavStat } from "@/components/ui/reference-nav-stat";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/cn";

export interface NffcMarketPanelProps {
  /** The exact shape `GET /api/nffc/[tokenId]/market` returns; `null` while loading. */
  readonly snapshot: NffcMarketSnapshot | null;
  readonly loading?: boolean;
  readonly now?: number;
  readonly className?: string;
}

/**
 * The dynamic side of an NFFC's detail view — Reference NAV + performance
 * windows, driven by the same `NffcMarketSnapshot` contract the Price/NAV
 * Engines (TASK-22/23) will fill in. Every number carries source + timestamp;
 * loading and unavailable states are explicit (TASK-15 acceptance).
 */
export function NffcMarketPanel({
  snapshot,
  loading,
  now,
  className,
}: NffcMarketPanelProps) {
  if (loading) {
    return (
      <div
        className={cn("flex flex-col gap-4", className)}
        aria-busy="true"
        aria-live="polite"
      >
        <Skeleton className="h-16 w-40" />
        <Skeleton className="h-14 w-full" />
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <ReferenceNavStat
        data={snapshot?.referenceNav ?? null}
        unavailableReason={snapshot?.unavailableReason}
        now={now}
      />
      <PerformanceWindows points={snapshot?.performance ?? null} now={now} />
      {snapshot?.degraded && snapshot.referenceNav && (
        <Badge variant="warning" className="w-fit">
          Some component prices are stale — figures may be degraded
        </Badge>
      )}
    </div>
  );
}
