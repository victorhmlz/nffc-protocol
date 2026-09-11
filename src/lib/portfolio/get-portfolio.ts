/**
 * `/portfolio`'s one data-access seam (TASK-25). Fixes the exact eventual
 * contract — `GetPortfolio` — the real indexer (TASK-24, merged) fulfills
 * once there's a live database to query `WHERE owner_address = $1` against;
 * until then, answers it the same way `get-listings.ts` (TASK-20) does:
 * filtering the same `FIXTURE_LISTINGS` array `/market` already reads (one
 * indexed `nffc`/`listing` mirror table, two different queries over it), and
 * fetching each held token's Reference NAV + performance via
 * `getNffcMarketSnapshot` (TASK-21) — the same per-token seam
 * `/nffc/[tokenId]` already uses, so wiring a live NAV engine (TASK-22/23,
 * still blocked on TASK-31's deploy) benefits both pages identically with no
 * change here.
 *
 * `async`, not wrapped in `unstable_cache` — matches `getNffcMarketSnapshot`
 * itself, which this composes: portfolio data is per-wallet, not a shared
 * cacheable query like the marketplace explore listing is.
 */
import { aggregatePortfolio, type Portfolio, type PortfolioHolding } from "@domain/portfolio/portfolio";
import type { UnixSeconds } from "@domain/shared/branded";
import { FIXTURE_LISTINGS } from "@/lib/marketplace/fixture-listings";
import { getNffcMarketSnapshot } from "@/lib/nffc-detail/get-nffc-market-snapshot";

export type GetPortfolio = (ownerAddress: string) => Promise<Portfolio>;

export const getPortfolio: GetPortfolio = async (ownerAddress) => {
  const owned = FIXTURE_LISTINGS.filter(
    (item) => item.ownerAddress.toLowerCase() === ownerAddress.toLowerCase(),
  );

  const holdings: PortfolioHolding[] = await Promise.all(
    owned.map(async (nffc) => ({ nffc, market: await getNffcMarketSnapshot(nffc.tokenId) })),
  );

  const asOf = Math.floor(Date.now() / 1000) as UnixSeconds;
  return aggregatePortfolio(ownerAddress, holdings, asOf);
};
