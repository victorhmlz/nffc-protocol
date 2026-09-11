/**
 * `/search`'s one data-access seam (TASK-28). Fixes the exact eventual
 * contract — `GetSearchResults` — the real indexer (TASK-24, merged)
 * fulfills once there's a live database to query; until then, answers it by
 * running the pure reference search (`domain/search/search.ts`) over
 * `FIXTURE_LISTINGS` (`@/lib/marketplace/fixture-listings`, TASK-20 — the
 * same indexed `nffc`/`nffc_component` mirror `/market`, `/portfolio`, and
 * `/profile/[address]` already read).
 *
 * Wrapped in `unstable_cache`, same as `get-listings.ts` (TASK-20) — public,
 * shareable, indexed-data results.
 */
import { unstable_cache } from "next/cache";
import { search, type SearchResults } from "@domain/search/search";
import { FIXTURE_LISTINGS } from "@/lib/marketplace/fixture-listings";

export type GetSearchResults = (query: string) => Promise<SearchResults>;

const getCached = unstable_cache(
  async (query: string): Promise<SearchResults> => search(FIXTURE_LISTINGS, query),
  ["search-results"],
  { revalidate: 300, tags: ["search-results"] },
);

export const getSearchResults: GetSearchResults = async (query) => getCached(query);
