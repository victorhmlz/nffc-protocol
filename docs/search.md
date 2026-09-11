# Search (TASK-28)

"Búsqueda de NFFCs, activos, colecciones, wallets" (`NFFC_Development_Plan.md` v3.4 TASK-28).
Depends on TASK-24 (Indexer), merged. Live at `/search`.

## Acceptance

> Búsqueda por composición parcial (ej. "contiene NVDA" o "contiene ETH") funciona sobre datos
> indexados.

Met directly: typing an asset symbol (e.g. `NVDA`) returns every indexed NFFC whose composition
contains it, over the same in-memory indexed data every other search/filter surface in this
codebase already operates on (`domain/marketplace/listings.ts`'s own acceptance property, TASK-20)
— nothing here calls a chain reader.

## Compute layer (pure, `domain/search/search.ts`)

`search(all, query)` runs one query string against all four facets at once, reusing two contracts
this TASK doesn't own rather than inventing parallel ones:

- **NFFCs** — reuses `IndexedNffcSummary` directly (`domain/marketplace/listings.ts`, TASK-20).
  Matches by exact `tokenId`, a collection-name substring, or **any component's asset symbol**
  (the partial-composition acceptance criterion). Newest-minted first.
- **Assets** — new `AssetSearchResult` (no existing type fit: symbol, class, and a count of how
  many indexed NFFCs contain it). Grouped by `assetId`, sorted by that count descending.
- **Collections** — reuses `CreatedCollectionSummary` directly (`domain/profile/profile.ts`,
  TASK-27) — same shape, same `CollectionsList` UI component reused as-is.
- **Wallets** — new `WalletSearchResult` (address + separate created/owned counts). Matches by a
  case-insensitive substring of the address — a full address, a prefix, or any contiguous slice
  all work. Sorted by total (created + owned) descending.

A blank/whitespace-only query returns empty results across every facet — an empty search box
never silently means "show everything" (the same forgiving-but-not-surprising default
`queryListings`/`queryActivity` use for an out-of-range page).

Fully unit-tested (11 tests) — no chain, no database, no clock.

## Data access — `src/lib/search/get-search-results.ts`, `parse-query.ts`

`getSearchResults(query)` runs `search` over `FIXTURE_LISTINGS` (TASK-20's fixture, the same one
`/market`, `/portfolio`, and `/profile/[address]` all read), `unstable_cache`d like
`get-listings.ts`. `parseSearchQuery` extracts `?q=` from the URL, never throwing on a malformed
one.

## UI

- **`SearchBar`** — a plain HTML `<form method="GET" action="/search">`. No client JS at all:
  submitting it is a normal browser navigation to `/search?q=...`, which the server renders fully
  — the search box has always had this property, this codebase didn't need to build it.
- **`AssetResultsList`**, **`WalletResultsList`** (new, `src/components/search/`) — small, focused
  list components; `WalletResultsList` links each match to `/profile/[address]` (TASK-27, live).
- **`CollectionsList`** (`src/components/profile/`, TASK-27) — reused as-is for the collections
  facet, with its empty-state message now configurable (`emptyLabel`, additive, defaults to
  TASK-27's original copy so that page is unchanged) since "hasn't created a collection yet" would
  be a confusing thing to say about a *search* with no matches.
- **`NffcSummaryGrid`** (`src/components/nffc/`, TASK-25/27) — reused as-is for the NFFC facet.

`/search` itself is a plain Server Component reading `searchParams`, the same "previous model"
caching story `/market`/`/activity` already carry (`docs/OPEN_ISSUES.md` Issue #5 — reading
`searchParams` forces per-request dynamic rendering; the underlying data is still cached via
`unstable_cache`).

## What's still deferred

- Asset matching is symbol-only — `IndexedComponent` doesn't carry a full asset name, only its
  symbol, so a query like "NVIDIA" (spelled out) won't match `NVDA`. Matches the exact indexed
  shape available; not a new gap, just an honest boundary.
- No live data — same fixture + `unstable_cache` story every indexed-data surface in this codebase
  carries until TASK-31.
- Collections found by search link to `/collection/[collectionId]`, which doesn't exist yet
  (`docs/OPEN_ISSUES.md` Issue #11, TASK-27).
