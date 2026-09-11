import type { Metadata } from "next";
import { Container } from "@/components/ui";
import { SearchBar } from "@/components/search/search-bar";
import { AssetResultsList } from "@/components/search/asset-results-list";
import { WalletResultsList } from "@/components/search/wallet-results-list";
import { CollectionsList } from "@/components/profile/collections-list";
import { NffcSummaryGrid } from "@/components/nffc/nffc-summary-grid";
import { getSearchResults } from "@/lib/search/get-search-results";
import { parseSearchQuery, type RawSearchParams } from "@/lib/search/parse-query";

// Same "previous model" caching story as `/market`/`/activity`
// (`docs/marketplace-ui.md`): reading `searchParams` opts this route into
// per-request dynamic rendering; `revalidate` here caches the underlying
// *data* (`get-search-results.ts`'s `unstable_cache`), not the route's HTML.
export const revalidate = 300;

export const metadata: Metadata = {
  title: "Search",
  description: "Search NFFCs, assets, collections, and wallets — over indexed data.",
};

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const raw = await searchParams;
  const query = parseSearchQuery(raw);
  const results = query ? await getSearchResults(query) : null;

  return (
    <Container className="flex flex-col gap-8 py-10">
      <header className="flex flex-col gap-1">
        <h1 className="text-lg font-semibold tracking-tight">Search</h1>
        <p className="text-sm text-muted-foreground">
          Search NFFCs, assets, collections, and wallets — over indexed data, never a per-item
          on-chain read.
        </p>
      </header>

      <SearchBar defaultValue={query} />

      {results && (
        <>
          <p className="text-sm text-muted-foreground">
            {results.nffcs.length + results.assets.length + results.collections.length + results.wallets.length}{" "}
            result(s) for &ldquo;{results.query}&rdquo;.
          </p>

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            <AssetResultsList assets={results.assets} />
            <CollectionsList collections={results.collections} emptyLabel="No matching collections." />
            <WalletResultsList wallets={results.wallets} />
          </div>

          <section className="flex flex-col gap-3">
            <h2 className="text-sm font-semibold tracking-tight">NFFCs ({results.nffcs.length})</h2>
            <NffcSummaryGrid items={results.nffcs} emptyLabel="No matching NFFCs." />
          </section>
        </>
      )}
    </Container>
  );
}
