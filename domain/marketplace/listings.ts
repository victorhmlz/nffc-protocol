/**
 * Marketplace explore/filter contract (TASK-20). The **indexer** (TASK-24) is
 * the real source for everything here — this module fixes the exact shape it
 * will expose per NFFC (mirroring `docs/spec/09-data-model.md`'s `nffc` /
 * `nffc_component` / `listing` tables, flattened into one read-optimized
 * summary) and the exact filter/sort/paginate semantics, so the acceptance
 * criterion — filters operate on indexed data, never a per-item on-chain
 * read — is structural: nothing here calls a chain reader, and nothing
 * upstream of it needs to either (`docs/marketplace-ui.md`).
 *
 * {@link queryListings} is the reference implementation of that semantics: a
 * pure, framework/infra-agnostic function over an in-memory array. Until
 * TASK-24 exists, `src/lib/marketplace/get-listings.ts` calls it directly
 * over a static fixture; once the indexer lands, the real data-access
 * function reproduces the same filter/sort/paginate rules as a SQL query —
 * this function remains the spec and the test oracle for that translation.
 */
import type { CompositionSegment } from "@domain/nffc/composition";
import type { MintConditionRegime } from "@domain/mint-condition/mint-condition";
import type { AssetClass } from "@domain/registry/types";

export interface IndexedComponent {
  readonly position: number;
  readonly assetId: string;
  readonly assetSymbol: string;
  readonly assetClass: AssetClass;
  readonly weightBps: number;
}

export interface IndexedListing {
  readonly sellerAddress: string;
  /** Wei, as a decimal string — never a `number` (precision) or `bigint`
   *  (not RSC-serializable across the server/client boundary). */
  readonly priceWei: string;
  readonly active: boolean;
}

export interface IndexedNffcSummary {
  readonly tokenId: string;
  readonly collectionId: string;
  readonly collectionName: string;
  readonly creatorAddress: string;
  readonly ownerAddress: string;
  readonly segment: CompositionSegment;
  /** `[0, 1]` — `staticRarityScore` (TASK-14); higher = rarer. */
  readonly staticRarity: number;
  readonly mintConditionRegime: MintConditionRegime;
  readonly componentCount: number;
  /** On-chain order; a card shows a summary, not necessarily every row. */
  readonly components: readonly IndexedComponent[];
  readonly artURI: string;
  /** ISO 8601. */
  readonly mintedAt: string;
  /** `null` when never listed or the listing was cancelled/sold. */
  readonly listing: IndexedListing | null;
}

export type MarketplaceSort = "newest" | "price_asc" | "price_desc" | "rarity_desc";

export interface MarketplaceFilter {
  /** Omitted/undefined = every segment. */
  readonly segment?: CompositionSegment;
  /** `[0, 1]` inclusive lower bound; omitted = no floor. */
  readonly minStaticRarity?: number;
  /** Omitted/empty = every regime. */
  readonly mintRegime?: readonly MintConditionRegime[];
  /** `true` = only NFFCs with an active listing. */
  readonly listedOnly?: boolean;
}

export interface MarketplaceQuery {
  readonly filter: MarketplaceFilter;
  readonly sort: MarketplaceSort;
  /** 1-based. */
  readonly page: number;
  readonly pageSize: number;
}

export interface MarketplaceQueryResult {
  readonly items: readonly IndexedNffcSummary[];
  readonly total: number;
  readonly page: number;
  readonly pageSize: number;
}

export const DEFAULT_PAGE_SIZE = 24;
export const MAX_PAGE_SIZE = 100;

function matchesFilter(item: IndexedNffcSummary, filter: MarketplaceFilter): boolean {
  if (filter.segment !== undefined && item.segment !== filter.segment) return false;
  if (filter.minStaticRarity !== undefined && item.staticRarity < filter.minStaticRarity) {
    return false;
  }
  if (filter.mintRegime && filter.mintRegime.length > 0) {
    if (!filter.mintRegime.includes(item.mintConditionRegime)) return false;
  }
  if (filter.listedOnly && !item.listing?.active) return false;
  return true;
}

function priceOf(item: IndexedNffcSummary): bigint | null {
  return item.listing?.active ? BigInt(item.listing.priceWei) : null;
}

function compareBy(sort: MarketplaceSort) {
  return (a: IndexedNffcSummary, b: IndexedNffcSummary): number => {
    switch (sort) {
      case "newest":
        return b.mintedAt.localeCompare(a.mintedAt);
      case "rarity_desc":
        return b.staticRarity - a.staticRarity;
      case "price_asc":
      case "price_desc": {
        const pa = priceOf(a);
        const pb = priceOf(b);
        // Unlisted items have no price — they sort after every listed item,
        // regardless of direction, and fall back to newest-first among
        // themselves.
        if (pa === null && pb === null) return b.mintedAt.localeCompare(a.mintedAt);
        if (pa === null) return 1;
        if (pb === null) return -1;
        const cmp = pa < pb ? -1 : pa > pb ? 1 : 0;
        return sort === "price_asc" ? cmp : -cmp;
      }
    }
  };
}

/**
 * The reference filter/sort/paginate semantics over the indexed shape — see
 * this module's header. `page`/`pageSize` are clamped to sane bounds rather
 * than trusted verbatim (an out-of-range page returns an empty `items`, not
 * an error — the same forgiving behavior a real paginated query gives a
 * stale UI link).
 */
export function queryListings(
  all: readonly IndexedNffcSummary[],
  query: MarketplaceQuery,
): MarketplaceQueryResult {
  const pageSize = Math.min(Math.max(1, Math.trunc(query.pageSize) || DEFAULT_PAGE_SIZE), MAX_PAGE_SIZE);
  const page = Math.max(1, Math.trunc(query.page) || 1);

  const filtered = all.filter((item) => matchesFilter(item, query.filter));
  const sorted = [...filtered].sort(compareBy(query.sort));

  const start = (page - 1) * pageSize;
  const items = sorted.slice(start, start + pageSize);

  return { items, total: filtered.length, page, pageSize };
}
