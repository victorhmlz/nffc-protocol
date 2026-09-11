"use client";

/**
 * `/portfolio` (TASK-25) — the connected wallet's owned NFFCs, Reference
 * value, performance, and exposure by asset/segment/collection
 * (`docs/spec/01-product-spec.md` §6.4, `07-ux-map.md`).
 *
 * `07-ux-map.md` §1 classifies this route "Server for data + Client for
 * actions", the same split `/nffc/[tokenId]` uses. That split isn't
 * reachable here as literally stated: `/portfolio` carries no `[address]`
 * URL segment, and in this self-custody DApp wallet identity exists **only**
 * client-side (`useAccount()`, TASK-16) — there is no session/cookie a
 * Server Component could read to know which wallet's holdings to render.
 * The closest honest equivalent: the actual computation
 * (`getPortfolio`/`aggregatePortfolio`) runs server-side, behind
 * `/api/portfolio/[address]` — this page is a thin Client Component whose
 * only job is knowing which address to ask for. Flagged as
 * `docs/OPEN_ISSUES.md` Issue #10 rather than silently deviating from the
 * documented split.
 */
import { useAccount } from "wagmi";
import { Container } from "@/components/ui/container";
import { ConnectWalletButton } from "@/components/wallet/connect-wallet-button";
import { NetworkBanner } from "@/components/wallet/network-banner";
import { HoldingsGrid } from "@/components/portfolio/holdings-grid";
import { PortfolioSummary } from "@/components/portfolio/portfolio-summary";
import { ExposureBreakdown, type ExposureRow } from "@/components/portfolio/exposure-breakdown";
import { usePortfolio } from "@/lib/portfolio/use-portfolio";
import { SEGMENT_META } from "@domain/nffc/segment";

export default function PortfolioPage() {
  const { address, isConnected } = useAccount();
  const { portfolio, loading, error } = usePortfolio(isConnected ? address : undefined);

  return (
    <Container className="flex flex-col gap-8 py-10">
      <header className="flex flex-col gap-1">
        <h1 className="text-lg font-semibold tracking-tight">Portfolio</h1>
        <p className="text-sm text-muted-foreground">
          Owned NFFCs, Reference NAV, performance since mint, and exposure by asset, segment, and
          collection — for your connected wallet only.
        </p>
      </header>

      <NetworkBanner />

      {!isConnected ? (
        <div className="flex flex-col items-start gap-3 rounded-lg border border-dashed border-border p-8">
          <p className="text-sm text-muted-foreground">
            Connect a wallet to view its portfolio.
          </p>
          <ConnectWalletButton />
        </div>
      ) : (
        <>
          <ConnectWalletButton />
          {loading && (
            <p role="status" aria-live="polite" className="text-sm text-muted-foreground">
              Loading portfolio…
            </p>
          )}
          {error && (
            <p role="alert" className="text-sm text-loss">
              {error}
            </p>
          )}
          {portfolio && !loading && (
            <>
              <PortfolioSummary portfolio={portfolio} />
              <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
                <ExposureBreakdown
                  title="Exposure by asset"
                  rows={portfolio.exposureByAsset.map(
                    (e): ExposureRow => ({
                      key: e.assetId,
                      label: e.assetSymbol,
                      value: e.value,
                      weightOfPortfolio: e.weightOfPortfolio,
                    }),
                  )}
                  emptyLabel="No priced holdings yet."
                />
                <ExposureBreakdown
                  title="Exposure by segment"
                  rows={portfolio.exposureBySegment.map(
                    (e): ExposureRow => ({
                      key: e.segment,
                      label: SEGMENT_META[e.segment].label,
                      sublabel: `(${e.holdingCount})`,
                      value: e.value,
                      weightOfPortfolio: e.weightOfPortfolio,
                    }),
                  )}
                  emptyLabel="No priced holdings yet."
                />
                <ExposureBreakdown
                  title="Exposure by collection"
                  rows={portfolio.exposureByCollection.map(
                    (e): ExposureRow => ({
                      key: e.collectionId,
                      label: e.collectionName,
                      sublabel: `(${e.holdingCount})`,
                      value: e.value,
                      weightOfPortfolio: e.weightOfPortfolio,
                    }),
                  )}
                  emptyLabel="No priced holdings yet."
                />
              </div>
              <HoldingsGrid portfolio={portfolio} />
            </>
          )}
        </>
      )}
    </Container>
  );
}
