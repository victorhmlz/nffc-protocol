import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui";

export interface MintConditionCardProps {
  /** `StaticNffcFacts.mintConditionTrait` — `toMetadataTrait(...)`'s flattened
   *  record (TASK-13), or `null` before the price engine (TASK-22) exists. */
  readonly trait: Readonly<Record<string, string | number>> | null;
}

const LABEL_ORDER = ["Regime", "Weighted Drawdown (bps)", "Components At Highs", "Minted At Block"];

/**
 * The mint-condition trait (TASK-13) — a weighted market-state snapshot
 * frozen at mint, oracle-sourced, part of the pinned static metadata (never
 * recomputed, never volatile — distinct from `NffcMarketPanel`'s live data).
 */
export function MintConditionCard({ trait }: MintConditionCardProps) {
  if (!trait) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Mint condition</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Not available — frozen once the price engine (TASK-22) is live.
          </p>
        </CardContent>
      </Card>
    );
  }

  const keys = [
    ...LABEL_ORDER.filter((k) => k in trait),
    ...Object.keys(trait).filter((k) => !LABEL_ORDER.includes(k)),
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Mint condition</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <p className="text-xs text-subtle-foreground">
          A weighted market-state snapshot frozen at mint, oracle-sourced — part of the immutable
          pinned metadata, not live market data.
        </p>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
          {keys.map((k) => (
            <div key={k} className="contents">
              <dt className="text-subtle-foreground">{k}</dt>
              <dd className="text-right font-mono tabular-nums">{trait[k]}</dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  );
}
