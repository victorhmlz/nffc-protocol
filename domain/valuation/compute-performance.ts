/**
 * Performance windows (TASK-23 entregable: "ventanas de performance") over a
 * Reference NAV history — 1D / 7D / 30D / SINCE_MINT, the exact shape
 * `PerformanceWindows` (TASK-15) already renders. Pure: given a `NavPoint`
 * series and the current + mint timestamps, no I/O — reading that series back
 * from storage is `NavStore`'s job (`domain/ports/nav-store.ts`).
 */
import type { UnixSeconds } from "@domain/shared/branded";
import type { NavPoint, PerformancePoint, PerformanceWindow } from "@domain/valuation/types";

const FIXED_WINDOWS: readonly { readonly window: Exclude<PerformanceWindow, "SINCE_MINT">; readonly seconds: number }[] = [
  { window: "1D", seconds: 86_400 },
  { window: "7D", seconds: 604_800 },
  { window: "30D", seconds: 2_592_000 },
];

/** The latest point at or before `targetSeconds`, or `null` if none exists yet. */
function findAtOrBefore(sortedAscending: readonly NavPoint[], targetSeconds: number): NavPoint | null {
  let result: NavPoint | null = null;
  for (const point of sortedAscending) {
    if (point.at > targetSeconds) break;
    result = point;
  }
  return result;
}

function fractionalChange(from: NavPoint, to: NavPoint): number {
  if (from.value === 0) return 0; // undefined % change from a zero base — report flat rather than Infinity/NaN
  return (to.value - from.value) / from.value;
}

/**
 * `history` need not be pre-sorted. A fixed window (1D/7D/30D) is included
 * only when a point old enough to anchor it already exists — a token minted
 * an hour ago simply has no 7D window yet, rather than a fabricated one.
 * `SINCE_MINT` always appears once there is at least one point: it anchors on
 * the earliest point at or before `mintedAt` when one exists, or otherwise
 * the earliest point actually recorded — an honest "since we started
 * tracking" proxy when a true since-mint observation predates this NAV
 * engine's own history (e.g. a token minted before TASK-23 existed).
 */
export function computePerformanceWindows(
  history: readonly NavPoint[],
  now: UnixSeconds,
  mintedAt: UnixSeconds,
): readonly PerformancePoint[] {
  if (history.length === 0) return [];

  const sorted = [...history].sort((a, b) => a.at - b.at);
  const to = sorted[sorted.length - 1]!;

  const points: PerformancePoint[] = [];
  for (const { window, seconds } of FIXED_WINDOWS) {
    const from = findAtOrBefore(sorted, now - seconds);
    if (!from) continue;
    points.push({ window, change: fractionalChange(from, to), from, to });
  }

  const sinceMintFrom = findAtOrBefore(sorted, mintedAt) ?? sorted[0]!;
  points.push({ window: "SINCE_MINT", change: fractionalChange(sinceMintFrom, to), from: sinceMintFrom, to });

  return points;
}
