import type { HealthReport } from "@infra/health";
import { Badge, Card, CardContent, CardHeader, CardTitle } from "@/components/ui";

const STATUS_VARIANT = {
  ok: "gain",
  down: "loss",
  not_configured: "neutral",
} as const;

/** System health (TASK-31's "salud del sistema") — the real
 *  `infra/health.ts.checkHealth()` (TASK-04), not a fixture: this is the one
 *  admin facet with something genuinely live to show today, deployed
 *  contracts or not. */
export function HealthSummary({ report }: { readonly report: HealthReport }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>System health</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <Badge variant={report.status === "ok" ? "gain" : "warning"}>{report.status}</Badge>
          <span className="text-xs text-subtle-foreground">env: {report.env}</span>
        </div>
        <dl className="grid grid-cols-3 gap-3 text-sm">
          {(["database", "redis", "rpc"] as const).map((dep) => (
            <div key={dep} className="flex flex-col gap-1">
              <dt className="text-xs text-subtle-foreground">{dep}</dt>
              <dd>
                <Badge variant={STATUS_VARIANT[report.checks[dep]]}>{report.checks[dep]}</Badge>
              </dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  );
}
