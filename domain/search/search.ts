/**
 * Search across NFFCs, assets, collections, and wallets (TASK-28) —
 * "Búsqueda de NFFCs, activos, colecciones, wallets"
 * (`NFFC_Development_Plan.md` v3.4 TASK-28). The one acceptance criterion —
 * "Búsqueda por composición parcial (ej. 'contiene NVDA') funciona sobre
 * datos indexados" — is exactly the NFFC facet below: a query matching a
 * component's asset symbol returns every indexed NFFC containing it.
 *
 * Reuses two contracts this TASK doesn't own rather than inventing parallel
 * ones: {@link IndexedNffcSummary} (`domain/marketplace/listings.ts`, TASK-20
 * — the same indexed `nffc`/`nffc_component` mirror `/market`, `/portfolio`,
 * and `/profile/[address]` already read) for the NFFC facet, and
 * {@link CreatedCollectionSummary} (`domain/profile/profile.ts`, TASK-27) for
 * the collection facet — same shape, same rendering
 * (`src/components/profile/collections-list.tsx` is reused as-is).
 */
import type { AssetClass } from "@domain/registry/types";
import type { IndexedNffcSummary } from "@domain/marketplace/listings";
import type { CreatedCollectionSummary } from "@domain/profile/profile";

export interface AssetSearchResult {
  readonly assetId: string;
  readonly assetSymbol: string;
  readonly assetClass: AssetClass;
  /** How many indexed NFFCs contain this asset. */
  readonly nffcCount: number;
}

export interface WalletSearchResult {
  readonly address: string;
  readonly createdCount: number;
  readonly ownedCount: number;
}

export interface SearchResults {
  readonly query: string;
  /** Newest-minted first. */
  readonly nffcs: readonly IndexedNffcSummary[];
  /** Sorted by `nffcCount` descending. */
  readonly assets: readonly AssetSearchResult[];
  /** Sorted by `nffcCount` descending. */
  readonly collections: readonly CreatedCollectionSummary[];
  /** Sorted by total (created + owned) count descending. */
  readonly wallets: readonly WalletSearchResult[];
}

function includes(haystack: string, needle: string): boolean {
  return haystack.toLowerCase().includes(needle.toLowerCase());
}

function searchNffcs(all: readonly IndexedNffcSummary[], query: string): readonly IndexedNffcSummary[] {
  const matches = all.filter(
    (n) =>
      n.tokenId === query ||
      includes(n.collectionName, query) ||
      n.components.some((c) => includes(c.assetSymbol, query)),
  );
  return [...matches].sort((a, b) => b.mintedAt.localeCompare(a.mintedAt));
}

function searchAssets(all: readonly IndexedNffcSummary[], query: string): readonly AssetSearchResult[] {
  const byAsset = new Map<string, { symbol: string; assetClass: AssetClass; count: number }>();
  for (const n of all) {
    for (const c of n.components) {
      if (!includes(c.assetSymbol, query)) continue;
      const existing = byAsset.get(c.assetId);
      if (existing) existing.count += 1;
      else byAsset.set(c.assetId, { symbol: c.assetSymbol, assetClass: c.assetClass, count: 1 });
    }
  }
  return Array.from(byAsset.entries(), ([assetId, v]) => ({
    assetId,
    assetSymbol: v.symbol,
    assetClass: v.assetClass,
    nffcCount: v.count,
  })).sort((a, b) => b.nffcCount - a.nffcCount);
}

function searchCollections(
  all: readonly IndexedNffcSummary[],
  query: string,
): readonly CreatedCollectionSummary[] {
  const byCollection = new Map<string, { name: string; count: number }>();
  for (const n of all) {
    if (!includes(n.collectionName, query)) continue;
    const existing = byCollection.get(n.collectionId);
    if (existing) existing.count += 1;
    else byCollection.set(n.collectionId, { name: n.collectionName, count: 1 });
  }
  return Array.from(byCollection.entries(), ([collectionId, v]) => ({
    collectionId,
    collectionName: v.name,
    nffcCount: v.count,
  })).sort((a, b) => b.nffcCount - a.nffcCount);
}

function searchWallets(all: readonly IndexedNffcSummary[], query: string): readonly WalletSearchResult[] {
  const byWallet = new Map<string, { created: number; owned: number }>();
  const bump = (address: string, field: "created" | "owned") => {
    if (!includes(address, query)) return;
    const key = address.toLowerCase();
    const existing = byWallet.get(key) ?? { created: 0, owned: 0 };
    existing[field] += 1;
    byWallet.set(key, existing);
  };
  for (const n of all) {
    bump(n.creatorAddress, "created");
    bump(n.ownerAddress, "owned");
  }
  return Array.from(byWallet.entries(), ([address, v]) => ({
    address,
    createdCount: v.created,
    ownedCount: v.owned,
  })).sort((a, b) => b.createdCount + b.ownedCount - (a.createdCount + a.ownedCount));
}

/**
 * Search all four facets at once. A blank/whitespace-only query returns
 * empty results everywhere — an empty search box never means "match
 * everything" (the same forgiving-but-not-surprising default
 * `queryListings`/`queryActivity` use for an out-of-range page: an edge
 * input degrades to an empty, well-formed result, not an error or a flood).
 */
export function search(all: readonly IndexedNffcSummary[], query: string): SearchResults {
  const trimmed = query.trim();
  if (trimmed.length === 0) {
    return { query: trimmed, nffcs: [], assets: [], collections: [], wallets: [] };
  }
  return {
    query: trimmed,
    nffcs: searchNffcs(all, trimmed),
    assets: searchAssets(all, trimmed),
    collections: searchCollections(all, trimmed),
    wallets: searchWallets(all, trimmed),
  };
}
