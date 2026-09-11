import { formatUsd } from "@/lib/format-usd";
import { cn } from "@/lib/cn";

export interface ExposureRow {
  readonly key: string;
  readonly label: string;
  readonly sublabel?: string;
  readonly value: number;
  readonly weightOfPortfolio: number;
}

/**
 * One exposure breakdown (by asset, by segment, or by collection — TASK-25),
 * as a labelled bar list. Rows are already sorted by value descending
 * (`domain/portfolio/portfolio.ts`'s own contract) — this component doesn't
 * re-sort. A bar's width alone never carries the only signal (data-viz rule:
 * identity isn't color/geometry-alone) — every row also prints its exact
 * value and percentage.
 */
export function ExposureBreakdown({
  title,
  rows,
  emptyLabel,
  className,
}: {
  readonly title: string;
  readonly rows: readonly ExposureRow[];
  readonly emptyLabel: string;
  readonly className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">{emptyLabel}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {rows.map((row) => (
            <li key={row.key} className="flex flex-col gap-1">
              <div className="flex items-baseline justify-between gap-2 text-sm">
                <span className="font-medium">
                  {row.label}
                  {row.sublabel && (
                    <span className="ml-1 font-normal text-subtle-foreground">{row.sublabel}</span>
                  )}
                </span>
                <span className="font-mono tabular-nums text-subtle-foreground">
                  {formatUsd(row.value)} · {(row.weightOfPortfolio * 100).toFixed(1)}%
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-accent"
                  style={{ width: `${Math.min(100, Math.max(0, row.weightOfPortfolio * 100))}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
