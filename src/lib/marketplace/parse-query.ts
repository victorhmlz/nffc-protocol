/**
 * Turns the URL's search params (`?segment=MIXED&regime=near-highs&regime=mid&
 * minRarity=0.5&listed=1&sort=price_asc&page=2`) into a typed
 * `MarketplaceQuery`. Pure and framework-agnostic beyond the input shape
 * itself (`{ [key: string]: string | string[] | undefined }`, exactly what
 * Next.js's `searchParams` resolves to) — unit-testable without a request.
 * Unrecognized or malformed values fall back to their default rather than
 * throwing: a hand-edited or stale URL degrades to "no filter", never an
 * error page.
 */
import type { CompositionSegment } from "@domain/nffc/composition";
import type { MintConditionRegime } from "@domain/mint-condition/mint-condition";
import { DEFAULT_PAGE_SIZE, type MarketplaceQuery, type MarketplaceSort } from "@domain/marketplace/listings";

export type RawSearchParams = Record<string, string | string[] | undefined>;

const SEGMENTS: readonly CompositionSegment[] = ["CRYPTO_ONLY", "STOCK_ONLY", "MIXED"];
const REGIMES: readonly MintConditionRegime[] = ["at-highs", "near-highs", "mid", "deep-drawdown"];
const SORTS: readonly MarketplaceSort[] = ["newest", "price_asc", "price_desc", "rarity_desc"];

function first(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

function many(v: string | string[] | undefined): readonly string[] {
  if (v === undefined) return [];
  return Array.isArray(v) ? v : [v];
}

export function parseMarketplaceSearchParams(params: RawSearchParams): MarketplaceQuery {
  const segmentRaw = first(params.segment);
  const segment = SEGMENTS.includes(segmentRaw as CompositionSegment)
    ? (segmentRaw as CompositionSegment)
    : undefined;

  const minRarityRaw = first(params.minRarity);
  const minRarityNum = minRarityRaw === undefined ? NaN : Number(minRarityRaw);
  const minStaticRarity = Number.isFinite(minRarityNum) ? Math.min(1, Math.max(0, minRarityNum)) : undefined;

  const mintRegime = many(params.regime).filter((r): r is MintConditionRegime =>
    REGIMES.includes(r as MintConditionRegime),
  );

  const listedOnly = first(params.listed) === "1" ? true : undefined;

  const sortRaw = first(params.sort);
  const sort: MarketplaceSort = SORTS.includes(sortRaw as MarketplaceSort)
    ? (sortRaw as MarketplaceSort)
    : "newest";

  const pageRaw = Number(first(params.page));
  const page = Number.isFinite(pageRaw) && pageRaw >= 1 ? Math.trunc(pageRaw) : 1;

  return {
    filter: {
      segment,
      minStaticRarity,
      mintRegime: mintRegime.length > 0 ? mintRegime : undefined,
      listedOnly,
    },
    sort,
    page,
    pageSize: DEFAULT_PAGE_SIZE,
  };
}
