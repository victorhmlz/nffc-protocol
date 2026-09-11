import type { Metadata } from "next";
import { Container } from "@/components/ui";
import { MarketFilters } from "@/components/market/market-filters";
import { NffcGrid } from "@/components/market/nffc-grid";
import { Pagination } from "@/components/market/pagination";
import { getMarketplaceListings } from "@/lib/marketplace/get-listings";
import { parseMarketplaceSearchParams, type RawSearchParams } from "@/lib/marketplace/parse-query";

// Time-based revalidation for the underlying data fetch (`get-listings.ts`'s
// `unstable_cache`) — this project does not enable `cacheComponents`
// (`next.config.ts`), so reading `searchParams` below still opts each
// distinct filter/sort/page combination into per-request dynamic rendering;
// this `revalidate` caches the *data*, not the route's HTML, across those
// requests. See `docs/marketplace-ui.md` for the full explanation.
export const revalidate = 300;

export const metadata: Metadata = {
  title: "Marketplace",
  description: "Explore, filter, and buy Non-Fungible Financial Collectibles.",
};

function toURLSearchParams(raw: RawSearchParams): URLSearchParams {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(raw)) {
    if (value === undefined) continue;
    for (const v of Array.isArray(value) ? value : [value]) params.append(key, v);
  }
  return params;
}

export default async function MarketPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const raw = await searchParams;
  const query = parseMarketplaceSearchParams(raw);
  const result = await getMarketplaceListings(query);

  return (
    <Container className="flex flex-col gap-6 py-10">
      <header className="flex flex-col gap-1">
        <h1 className="text-lg font-semibold tracking-tight">Marketplace</h1>
        <p className="text-sm text-muted-foreground">
          {result.total} NFFC{result.total === 1 ? "" : "s"} match your filters.
        </p>
      </header>

      <MarketFilters />
      <NffcGrid result={result} />
      <Pagination
        page={result.page}
        pageSize={result.pageSize}
        total={result.total}
        buildHref={(page) => {
          const params = toURLSearchParams(raw);
          params.set("page", String(page));
          return `/market?${params.toString()}`;
        }}
      />
    </Container>
  );
}
