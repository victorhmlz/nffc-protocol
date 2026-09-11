/**
 * The marketplace explore page's one data-access seam (TASK-20). Fixes the
 * exact eventual contract — `GetMarketplaceListings` — that the real indexer
 * (TASK-24) fulfills; until then, {@link getMarketplaceListings} answers it by
 * running the pure reference query (`domain/marketplace/listings.ts`) over a
 * static fixture (`fixture-listings.ts`). `/market/page.tsx` imports only this
 * function — swapping the body for a real indexed SQL query (via `infra/db`)
 * is a TASK-24 change entirely local to this file.
 *
 * Wrapped in `unstable_cache` (this project's "previous model" caching —
 * `cacheComponents` is not enabled, see `next.config.ts`) so repeated
 * requests for the same query don't redo the work, the same role a real
 * indexed query's own caching would play. The cache key includes every
 * argument, so distinct filter/sort/page combinations never collide.
 */
import { unstable_cache } from "next/cache";
import { queryListings, type MarketplaceQuery, type MarketplaceQueryResult } from "@domain/marketplace/listings";
import { FIXTURE_LISTINGS } from "@/lib/marketplace/fixture-listings";

export type GetMarketplaceListings = (query: MarketplaceQuery) => Promise<MarketplaceQueryResult>;

const getCached = unstable_cache(
  async (query: MarketplaceQuery) => queryListings(FIXTURE_LISTINGS, query),
  ["marketplace-listings"],
  { revalidate: 300, tags: ["marketplace-listings"] },
);

export const getMarketplaceListings: GetMarketplaceListings = async (query) => getCached(query);
