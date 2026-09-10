import { Globe, Info } from "lucide-react";
import type { CompositionSegment } from "@domain/nffc/composition";
import { SEGMENT_META } from "@domain/nffc/segment";
import { cn } from "@/lib/cn";
import { Badge } from "@/components/ui/badge";

const BADGE_VARIANT = {
  CRYPTO_ONLY: "primary",
  STOCK_ONLY: "neutral",
  MIXED: "outline",
} as const satisfies Record<
  CompositionSegment,
  "primary" | "neutral" | "outline"
>;

/**
 * The derived composition segment. Presentational only — the segment is computed
 * from the composition (on-chain at mint, then indexed), never chosen here.
 */
export function SegmentBadge({
  segment,
  className,
}: {
  segment: CompositionSegment;
  className?: string;
}) {
  return (
    <Badge variant={BADGE_VARIANT[segment]} className={className}>
      {SEGMENT_META[segment].label}
    </Badge>
  );
}

/**
 * Geographic-eligibility disclosure. Any composition containing a tokenized
 * equity (STOCK_ONLY, MIXED) inherits the Robinhood Stock Token restriction
 * (`docs/spec/07-ux-map.md` §6; Whitepaper §14). CRYPTO_ONLY shows the
 * not-restricted note. Copy here is legal-reviewed before mainnet (TASK-40).
 */
export function GeoEligibilityNotice({
  segment,
  className,
}: {
  segment: CompositionSegment;
  className?: string;
}) {
  const meta = SEGMENT_META[segment];
  const Icon = meta.geoRestricted ? Globe : Info;

  return (
    <div
      role="note"
      className={cn(
        "flex items-start gap-2 rounded-md border p-3 text-xs",
        meta.geoRestricted
          ? "border-status-warning/40 bg-status-warning/10 text-foreground"
          : "border-border bg-muted text-muted-foreground",
        className,
      )}
    >
      <Icon
        aria-hidden
        className={cn(
          "mt-0.5 size-3.5 shrink-0",
          meta.geoRestricted ? "text-status-serious" : "text-subtle-foreground",
        )}
      />
      <p>
        <span className="font-medium">{meta.label}. </span>
        {meta.note}
      </p>
    </div>
  );
}
