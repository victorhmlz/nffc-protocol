import type { Portfolio } from "@domain/portfolio/portfolio";
import { ERROR_VOCABULARY } from "@domain/errors/errors";
import { Badge, Stat } from "@/components/ui";
import { formatUsd } from "@/lib/format-usd";

const WINDOW_LABEL: Record<Portfolio["performance"][number]["window"], string> = {
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
 * The portfolio's headline numbers (TASK-25): total Reference NAV across
 * every held NFFC, and the value-weighted performance windows
 * (`domain/portfolio/portfolio.ts`'s documented approximation — not a true
 * money-weighted return). Mirrors `NffcMarketPanel`'s degraded-badge
 * convention (TASK-15): the number is always shown, a warning sits
 * alongside it, never in place of it.
 *
 * Deliberately doesn't reuse `PerformanceWindows` (TASK-15) — that component
 * shows each window's absolute NAV (`to.value`), which is a *per-token*
 * figure; a portfolio-level window has no single meaningful NAV of its own
 * to show there, only the aggregate `change` — showing a percentage next to
 * the total above is the honest representation, not a fabricated dollar
 * figure repeated four times.
 */
export function PortfolioSummary({ portfolio }: { portfolio: Portfolio }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <Stat
          label="Total Reference Value"
          value={formatUsd(portfolio.totalReferenceValue)}
          hint={`${portfolio.holdings.length} NFFC${portfolio.holdings.length === 1 ? "" : "s"}`}
        />
        {portfolio.degraded && (
          <Badge variant="warning" title={ERROR_VOCABULARY.oracle_stale.recoveryAction}>
            {ERROR_VOCABULARY.oracle_stale.message}
          </Badge>
        )}
      </div>
      {portfolio.performance.length > 0 ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {portfolio.performance.map((p) => (
            <Stat
              key={p.window}
              label={WINDOW_LABEL[p.window]}
              value={formatPct(p.change)}
              delta={{
                label: `${p.holdingsIncluded} holding${p.holdingsIncluded === 1 ? "" : "s"}`,
                direction: p.change > 0 ? "up" : p.change < 0 ? "down" : "flat",
              }}
              aligned
            />
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground" role="status">
          Performance is not available yet.
        </p>
      )}
    </div>
  );
}
