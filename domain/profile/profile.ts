/**
 * Creator/collector profile (TASK-27) — "creado, poseído, coleccionado,
 * listado, actividad" (`NFFC_Development_Plan.md` v3.4 TASK-27). Composes
 * three contracts this TASK doesn't own, rather than inventing new ones:
 * {@link IndexedNffcSummary} (`domain/marketplace/listings.ts`, TASK-20 — the
 * same indexed `nffc`/`listing` mirror `/market` and `/portfolio` already
 * read, filtered a third way) and `ActivityEntry`
 * (`domain/nffc-detail/detail.ts`, TASK-21/24, queried per-wallet by
 * `domain/activity/activity.ts`, TASK-26).
 *
 * `docs/spec/09-data-model.md` defines a `collection` mirror table
 * (`collection_id`, `creator_address`, `name`) that the indexer does not yet
 * populate (`docs/OPEN_ISSUES.md` Issue #9, TASK-24) — this module's
 * `collections` facet is therefore derived from the wallet's *minted* NFFCs
 * grouped by `collectionId`, not from a real `collection` row. An honest,
 * documented proxy: a collection with zero NFFCs minted into it yet (or one
 * this wallet didn't mint into) wouldn't appear. Not a new gap — the second
 * consumer of the same already-logged Issue #9.
 */
import type { IndexedNffcSummary } from "@domain/marketplace/listings";
import type { ActivityEntry } from "@domain/nffc-detail/detail";

export interface CreatedCollectionSummary {
  readonly collectionId: string;
  readonly collectionName: string;
  /** How many of this wallet's *created* NFFCs belong to this collection —
   *  not the collection's total size, which isn't knowable without the
   *  `collection` mirror table (see this module's header). */
  readonly nffcCount: number;
}

export interface Profile {
  readonly address: string;
  /** Newest-minted first. `creatorAddress === address`. */
  readonly created: readonly IndexedNffcSummary[];
  /** Newest-minted first. `ownerAddress === address` — the same indexed
   *  "fast path" ownership `docs/spec/09-data-model.md` §4 describes, not
   *  confirmed against chain here (this is a read-only display, not an
   *  owner-gated action). */
  readonly owned: readonly IndexedNffcSummary[];
  /** Newest-minted first. Actively listed with this wallet as seller. */
  readonly listed: readonly IndexedNffcSummary[];
  /** Sorted by `nffcCount` descending. */
  readonly collections: readonly CreatedCollectionSummary[];
  /** Newest first — whatever slice of `queryActivity`'s wallet filter the
   *  caller passed in; this module doesn't re-query or re-sort it. */
  readonly recentActivity: readonly ActivityEntry[];
}

function sameAddress(a: string, b: string): boolean {
  return a.toLowerCase() === b.toLowerCase();
}

function newestFirst(items: readonly IndexedNffcSummary[]): readonly IndexedNffcSummary[] {
  return [...items].sort((a, b) => b.mintedAt.localeCompare(a.mintedAt));
}

/**
 * Build one wallet's profile from the full indexed NFFC set and its
 * pre-fetched recent activity. Pure — no filtering/sorting decision is left
 * to the caller beyond what activity slice to pass in.
 */
export function buildProfile(
  address: string,
  allNffcs: readonly IndexedNffcSummary[],
  recentActivity: readonly ActivityEntry[],
): Profile {
  const created = newestFirst(allNffcs.filter((n) => sameAddress(n.creatorAddress, address)));
  const owned = newestFirst(allNffcs.filter((n) => sameAddress(n.ownerAddress, address)));
  const listed = newestFirst(
    allNffcs.filter((n) => n.listing?.active && sameAddress(n.listing.sellerAddress, address)),
  );

  const byCollection = new Map<string, { name: string; count: number }>();
  for (const n of created) {
    const existing = byCollection.get(n.collectionId);
    if (existing) existing.count += 1;
    else byCollection.set(n.collectionId, { name: n.collectionName, count: 1 });
  }
  const collections = Array.from(byCollection.entries(), ([collectionId, v]) => ({
    collectionId,
    collectionName: v.name,
    nffcCount: v.count,
  })).sort((a, b) => b.nffcCount - a.nffcCount);

  return { address, created, owned, listed, collections, recentActivity };
}
