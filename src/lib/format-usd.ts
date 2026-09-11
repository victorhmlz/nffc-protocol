/** `$1,234.56` — the same two-decimal USD style `ReferenceNavStat` and
 *  `PerformanceWindows` (TASK-15) already render inline; factored out here so
 *  TASK-25's new portfolio components don't inline a fourth copy. */
export function formatUsd(value: number): string {
  return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
