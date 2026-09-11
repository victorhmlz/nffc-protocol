import Link from "next/link";
import type { IndexedNffcSummary } from "@domain/marketplace/listings";
import { Badge, Card, CardContent, CardFooter, CardHeader, NffcArt, SegmentBadge, StaticRarityStat } from "@/components/ui";
import { BuyButton } from "@/components/market/buy-button";

const REGIME_LABEL: Record<IndexedNffcSummary["mintConditionRegime"], string> = {
  "at-highs": "Minted at highs",
  "near-highs": "Minted near highs",
  mid: "Minted mid-drawdown",
  "deep-drawdown": "Minted in deep drawdown",
};

/** `wei` decimal string → a short ETH display; not a price feed, just formatting. */
function formatEth(weiDecimal: string): string {
  const wei = BigInt(weiDecimal);
  const whole = wei / 1_000_000_000_000_000_000n;
  const fracRaw = wei % 1_000_000_000_000_000_000n;
  const frac = fracRaw.toString().padStart(18, "0").slice(0, 3).replace(/0+$/, "");
  return frac ? `${whole}.${frac} ETH` : `${whole} ETH`;
}

/**
 * One NFFC in the marketplace grid (TASK-20). Server-Component-compatible —
 * every prop is data already resolved server-side (`getMarketplaceListings`);
 * the only interactive island is `<BuyButton>`. Links to `/nffc/[tokenId]`
 * (TASK-21) — that route doesn't exist yet, so the link 404s until TASK-21
 * lands; see `docs/marketplace-ui.md` KNOWN ISSUES.
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
