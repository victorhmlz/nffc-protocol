/**
 * Turns the URL's search params (`?q=NVDA`) into the query string
 * `domain/search/search.ts` expects. Pure, unit-testable without a request —
 * same "never throw on a malformed URL" discipline as
 * `parseMarketplaceSearchParams`/`parseActivitySearchParams` (TASK-20/26).
 */
export type RawSearchParams = Record<string, string | string[] | undefined>;

function first(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

export function parseSearchQuery(params: RawSearchParams): string {
  return first(params.q) ?? "";
}
