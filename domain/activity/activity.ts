/**
 * Global activity timeline (TASK-26) — "Timeline on-chain/off-chain indexada
 * de mint, venta, transferencia, listing, oferta" (`NFFC_Development_Plan.md`
 * v3.2 TASK-26). "On-chain/off-chain" describes where the data comes from
 * (every event originates on-chain) versus where it's served from (the
 * indexer's off-chain Postgres mirror, `docs/spec/09-data-model.md` §1) —
 * not two different kinds of activity; there is exactly one `ActivityEntry`
 * shape, already fixed by TASK-21/24.
 *
 * Reuses `ActivityEntry`/`ActivityKind` (`domain/nffc-detail/detail.ts`)
 * directly rather than a parallel type — the per-NFFC timeline
 * (`ActivityTimeline`, TASK-21) and this global one are two queries over the
 * exact same indexed `activity` table (`docs/spec/09-data-model.md`), the
 * same "one read model, several queries" pattern `domain/marketplace/listings.ts`
 * (TASK-20) and `domain/portfolio/portfolio.ts` (TASK-25) already established
 * over `nffc`/`listing`.
 *
 * `ActivityEntry.tokenId` — added in TASK-24 specifically because "the
 * indexer... writes one global table across every token and genuinely needs
 * this" — is exactly what makes the per-NFFC filter here possible.
 */
import type { ActivityEntry, ActivityKind } from "@domain/nffc-detail/detail";

export interface ActivityFilter {
  /** Omitted/undefined = every token. */
  readonly tokenId?: string;
  /** Omitted/undefined = every wallet. Matches `actorAddress` OR
   *  `counterpartyAddress`, case-insensitively — either side of an entry
   *  counts as "this wallet's activity". */
  readonly wallet?: string;
  /** Omitted/empty = every kind. */
  readonly kind?: readonly ActivityKind[];
}

export interface ActivityQuery {
  readonly filter: ActivityFilter;
  /** 1-based. */
  readonly page: number;
  readonly pageSize: number;
}

export interface ActivityQueryResult {
  readonly items: readonly ActivityEntry[];
  readonly total: number;
  readonly page: number;
  readonly pageSize: number;
}

// Prefixed (unlike `domain/marketplace/listings.ts`'s generic
// `DEFAULT_PAGE_SIZE`/`MAX_PAGE_SIZE`, which claimed those names first) —
// both barrel through the wildcard `domain/index.ts` export, so a second
// `DEFAULT_PAGE_SIZE` here would collide.
export const ACTIVITY_DEFAULT_PAGE_SIZE = 50;
export const ACTIVITY_MAX_PAGE_SIZE = 200;

function matchesWallet(entry: ActivityEntry, wallet: string): boolean {
  const target = wallet.toLowerCase();
  return (
    entry.actorAddress.toLowerCase() === target ||
    entry.counterpartyAddress?.toLowerCase() === target
  );
}

function matchesFilter(entry: ActivityEntry, filter: ActivityFilter): boolean {
  if (filter.tokenId !== undefined && entry.tokenId !== filter.tokenId) return false;
  if (filter.wallet !== undefined && !matchesWallet(entry, filter.wallet)) return false;
  if (filter.kind && filter.kind.length > 0 && !filter.kind.includes(entry.kind)) return false;
  return true;
}

/** Newest first — matches `ActivityEntry`'s own documented convention
 *  (`domain/nffc-detail/detail.ts`). Ties (same `occurredAt`, possible for
 *  events in the same block) break on `blockNumber` descending, for a
 *  deterministic order independent of indexing/insertion order. */
function compareNewestFirst(a: ActivityEntry, b: ActivityEntry): number {
  const byTime = b.occurredAt.localeCompare(a.occurredAt);
  if (byTime !== 0) return byTime;
  return b.blockNumber - a.blockNumber;
}

/**
 * The reference filter/paginate semantics over the indexed shape — see this
 * module's header. `page`/`pageSize` are clamped rather than trusted
 * verbatim (an out-of-range page returns an empty `items`, not an error —
 * matches `queryListings`'s forgiving behavior, TASK-20).
 */
export function queryActivity(
  all: readonly ActivityEntry[],
  query: ActivityQuery,
): ActivityQueryResult {
  const pageSize = Math.min(
    Math.max(1, Math.trunc(query.pageSize) || ACTIVITY_DEFAULT_PAGE_SIZE),
    ACTIVITY_MAX_PAGE_SIZE,
  );
  const page = Math.max(1, Math.trunc(query.page) || 1);

  const filtered = all.filter((entry) => matchesFilter(entry, query.filter));
  const sorted = [...filtered].sort(compareNewestFirst);

  const start = (page - 1) * pageSize;
  const items = sorted.slice(start, start + pageSize);

  return { items, total: filtered.length, page, pageSize };
}
