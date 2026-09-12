import type { ProtocolReport } from "@domain/admin/admin";
import { Card, CardContent, CardHeader, CardTitle, Stat } from "@/components/ui";
import { formatEth } from "@/lib/format-eth";

/** "Reportes" (TASK-31) — a pure aggregation over the same indexed data
 *  every other read surface in this codebase already composes
 *  (`domain/admin/admin.ts`'s `buildProtocolReport`), not a new source. */
export function ProtocolReportPanel({ report }: { readonly report: ProtocolReport }) {
  const segmentEntries = Object.entries(report.segmentCounts) as [string, number][];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Protocol report</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Stat label="NFFCs" value={String(report.totalNffcs)} />
          <Stat label="Collections" value={String(report.totalCollections)} />
          <Stat label="Active listings" value={String(report.activeListingCount)} />
          <Stat label="Sales" value={String(report.saleCount)} />
        </div>
        <Stat label="Total sale volume" value={formatEth(report.totalSaleVolumeWei)} aligned />
        {segmentEntries.length > 0 && (
          <div className="flex flex-col gap-2">
            <h3 className="text-xs font-medium text-subtle-foreground">By segment</h3>
            <ul className="flex flex-wrap gap-4 text-sm">
              {segmentEntries.map(([segment, count]) => (
                <li key={segment}>
                  {segment}: <span className="font-mono tabular-nums">{count}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
