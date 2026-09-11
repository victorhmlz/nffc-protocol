import type { StaticComponentFact } from "@domain/metadata/metadata";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/cn";

export interface CompositionTableProps {
  /** `null` while the composition hasn't been read from chain yet. */
  readonly components: readonly StaticComponentFact[] | null;
  readonly loading?: boolean;
  readonly className?: string;
}

/**
 * The per-component composition table — asset, provider, and weight, straight
 * from on-chain data. No market dependency, so no oracle provenance is
 * required, but loading is still explicit rather than a blank table
 * (`docs/spec/07-ux-map.md` §5).
 */
export function CompositionTable({
  components,
  loading,
  className,
}: CompositionTableProps) {
  if (loading || !components) {
    return (
      <div
        className={cn("flex flex-col gap-2", className)}
        aria-busy="true"
        aria-live="polite"
      >
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton key={i} className="h-9 w-full" />
        ))}
      </div>
    );
  }

  return (
    <Table className={className}>
      <TableHeader>
        <TableRow>
          <TableHead>Asset</TableHead>
          <TableHead>Provider</TableHead>
          <TableHead numeric>Weight</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {components.map((c) => (
          <TableRow key={c.representationId}>
            <TableCell>
              <span className="font-medium">{c.assetSymbol}</span>{" "}
              <span className="text-xs text-subtle-foreground">
                {c.assetClass}
              </span>
            </TableCell>
            <TableCell className="text-sm text-muted-foreground">
              {c.providerId}
            </TableCell>
            <TableCell numeric>{(c.weightBps / 100).toFixed(2)}%</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
