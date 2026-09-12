import Link from "next/link";
import type { IndexedNffcSummary } from "@domain/marketplace/listings";
import {
  Badge,
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  GeoEligibilityNotice,
  NffcArt,
  SegmentBadge,
  StaticRarityStat,
} from "@/components/ui";
import { BuyButton } from "@/components/market/buy-button";
import { formatEth } from "@/lib/format-eth";

const REGIME_LABEL: Record<IndexedNffcSummary["mintConditionRegime"], string> = {
  "at-highs": "Minted at highs",
  "near-highs": "Minted near highs",
  mid: "Minted mid-drawdown",
  "deep-drawdown": "Minted in deep drawdown",
};

/**
 * One NFFC in the marketplace grid (TASK-20). Server-Component-compatible —
 * every prop is data already resolved server-side (`getMarketplaceListings`);
 * the only interactive island is `<BuyButton>`. Links to `/nffc/[tokenId]`
 * (TASK-21, merged since).
 */
export function NffcCard({ nffc }: { nffc: IndexedNffcSummary }) {
  return (
    <Card className="flex flex-col overflow-hidden">
      <Link href={`/nffc/${nffc.tokenId}`} className="block">
        <NffcArt
          input={{ seed: nffc.tokenId, components: nffc.components.map((c) => ({ assetId: c.assetId, weightBps: c.weightBps })) }}
          className="aspect-square"
        />
      </Link>
      <CardHeader className="flex-row items-start justify-between gap-2 pb-0">
        <div className="flex flex-col gap-1">
          <Link href={`/nffc/${nffc.tokenId}`} className="text-sm font-semibold tracking-tight hover:underline">
            NFFC #{nffc.tokenId}
          </Link>
          <span className="text-xs text-subtle-foreground">{nffc.collectionName}</span>
        </div>
        <SegmentBadge segment={nffc.segment} />
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <StaticRarityStat score={nffc.staticRarity} />
          <Badge variant="outline">{REGIME_LABEL[nffc.mintConditionRegime]}</Badge>
        </div>
        <span className="text-xs text-subtle-foreground">{nffc.componentCount} components</span>
        {/* TASK-08 acceptance: the UI must clearly communicate the
            geographic-eligibility difference wherever a segment is shown.
            /market is the first public, SEO-indexed, mass-grid surface that
            displays a segment — wired here (and in StepPreview) as of the
            TASK-20 review; see docs/reports/TASK-08-REPORT.md's correction
            note. */}
        <GeoEligibilityNotice segment={nffc.segment} className="p-2 text-[11px]" />
      </CardContent>
      <CardFooter className="flex items-center justify-between gap-3">
        {nffc.listing?.active ? (
          <>
            <span className="font-mono text-sm tabular-nums">{formatEth(nffc.listing.priceWei)}</span>
            <BuyButton tokenId={nffc.tokenId} priceWei={nffc.listing.priceWei} />
          </>
        ) : (
          <Badge variant="neutral">Not listed</Badge>
        )}
      </CardFooter>
    </Card>
  );
}
