# TASK 28 REPORT

## STATUS

COMPLETED

`pnpm verify` (lint · typecheck · test · build) green locally — **84 files, 454 tests** (432 → +22).
`pnpm contracts:build` / `pnpm contracts:test` unchanged — **172 Solidity tests** (TASK-28 touches
no `.sol`). `/search` smoke-tested live via `pnpm dev`, both with no query and with `?q=NVDA` —
see BUILD. PR not yet opened at time of writing this section — see PULL REQUEST for the final link.

## OBJECTIVE

"Búsqueda de NFFCs, activos, colecciones, wallets" (`NFFC_Development_Plan.md` v3.4 TASK-28).

## SCOPE NOTE

TASK-28 depends on TASK-24 (Indexer), merged. Second TASK in the Project Lead's block
authorization (TASK-27–30, chained on each predecessor's merged PR). Unlike TASK-25/26/27, TASK-28
carries an explicit acceptance criterion in the Development Plan, not just an objective line:

> Búsqueda por composición parcial (ej. "contiene NVDA" o "contiene ETH") funciona sobre datos
> indexados.

Full detail: `docs/search.md`.

## CHANGES

### `domain/search/search.ts` (new) — `search`

Pure, one query string against all four facets at once. Reuses `IndexedNffcSummary` (TASK-20)
directly for the NFFC facet — matching by exact `tokenId`, a collection-name substring, or **any
component's asset symbol** (the partial-composition acceptance criterion, verified live: `?q=NVDA`
returns exactly the indexed NFFCs containing NVDA). Reuses `CreatedCollectionSummary`
(`domain/profile/profile.ts`, TASK-27) for the collection facet. Two new types where nothing
existing fit: `AssetSearchResult` (symbol, class, matching-NFFC count) and `WalletSearchResult`
(address, separate created/owned counts, matched by a case-insensitive address substring). A
blank/whitespace query returns empty results everywhere, never "match everything".

### `src/lib/search/get-search-results.ts`, `parse-query.ts` (new)

`getSearchResults` runs `search` over `FIXTURE_LISTINGS` (TASK-20), `unstable_cache`d like
`get-listings.ts`. `parseSearchQuery` extracts `?q=`, never throwing on a malformed URL.

### `src/components/search/` (new) — `SearchBar`, `AssetResultsList`, `WalletResultsList`

`SearchBar` is a plain HTML `<form method="GET" action="/search">` — no client JS, no "use
client". `WalletResultsList` links each match to `/profile/[address]` (TASK-27, live).

### `src/components/profile/collections-list.tsx` (modified) — additive

Gained an optional `emptyLabel` prop (defaults to TASK-27's original copy — that page's rendering
is unchanged) so `/search` can reuse it for the collections facet without saying "hasn't created a
collection yet" about a search with no matches.

### `src/app/search/page.tsx` (new)

Server Component reading `searchParams` — same "previous model" caching story `/market`/`/activity`
already carry (`docs/OPEN_ISSUES.md` Issue #5).

### Docs

`docs/search.md` (new). `README.md` — status line, doc link.

## FILES CREATED

```
domain/search/search.ts
domain/search/search.test.ts
src/lib/search/get-search-results.ts
src/lib/search/parse-query.ts
src/lib/search/parse-query.test.ts
src/components/search/search-bar.tsx
src/components/search/search-bar.test.tsx
src/components/search/asset-results-list.tsx
src/components/search/asset-results-list.test.tsx
src/components/search/wallet-results-list.tsx
src/components/search/wallet-results-list.test.tsx
src/app/search/page.tsx
docs/search.md
docs/reports/TASK-28-REPORT.md
```

## FILES MODIFIED

```
domain/index.ts                                export search/search
src/components/profile/collections-list.tsx    + optional emptyLabel prop (additive)
src/components/profile/collections-list.test.tsx  + 1 test for the new prop
README.md                                      status line + doc link
```

Branch is based on `main` (TASK-00…27) — see PULL REQUEST.

## TESTS

`pnpm test` → Vitest, **84 files, 454 tests** (22 new):

```
domain/search/search.test.ts (11)                empty query -> empty everywhere; NFFCs match by
                                                  asset symbol (acceptance), case-insensitive +
                                                  partial symbol, exact tokenId, collection name,
                                                  newest-first sort; assets grouped + counted,
                                                  unrelated asset excluded; collections grouped +
                                                  counted; wallets matched by partial/case-
                                                  insensitive address, short substring, sorted by
                                                  total count
src/lib/search/parse-query.test.ts (3)           defaults to ""; returns q; first value wins when
                                                  repeated
src/components/search/search-bar.test.tsx (2)    renders a GET form to /search with a named q
                                                  input; prefills from defaultValue
src/components/search/asset-results-list.test.tsx (3)  empty state; lists symbol+class+count;
                                                  labels crypto distinctly from stock token
src/components/search/wallet-results-list.test.tsx (2) empty state; links to /profile/[address]
                                                  with created/owned counts
src/components/profile/collections-list.test.tsx (+1)  accepts a custom empty-state label
```

`pnpm contracts:test` → **172 Solidity tests**, unchanged (TASK-28 adds no `.sol`).

## BUILD

`pnpm build` green — **16 routes** (was 15; `+1`: `/search`).

Smoke-tested live via `pnpm dev`:

```
GET /search           → 200, no results section rendered (no query)
GET /search?q=NVDA    → 200, "3 results" (2 matching NFFCs + 1 matching asset), "NFFCs (2)",
                         "NVDA" / "Stock Token" / "Blue Chips" all render correctly
```

## LINT / TYPECHECK

Clean on the first pass — no fixes needed this TASK.

## SECURITY

STEP 5 AUDIT (`docs/spec/08-security-principles.md`):

| Concern | This TASK |
|---|---|
| Búsqueda por composición parcial funciona sobre datos indexados (acceptance) | `search`'s NFFC facet is a pure in-memory filter over `IndexedNffcSummary[]`; nothing in this TASK calls a chain reader, matching `domain/marketplace/listings.ts`'s own acceptance property (TASK-20) |
| No real network/database in tests (`docs/conventions.md` §4) | Domain tests use hand-built fixtures; `get-search-results.ts`/`page.tsx` are thin, untested glue, matching `get-listings.ts`'s own precedent |
| Malformed/stale URLs degrade gracefully | `parseSearchQuery` never throws; an absent `q` degrades to "" (no results), not an error |
| Works without JavaScript | `SearchBar` is a plain `<form>` — submitting it is a normal browser navigation, no client-side dependency to fail |

## PERFORMANCE

`search` is `O(n × c)` over the full indexed set (`n` NFFCs, `c` ≤ 20 components each) for the
NFFC/asset facets, `O(n)` for collections/wallets. No per-item network/DB calls.

## KNOWN ISSUES

1. **Asset matching is symbol-only.** `IndexedComponent` carries no full asset name, only its
   symbol — a query like "NVIDIA" won't match `NVDA`. Matches the exact indexed shape available;
   not a new gap, an honest scope boundary.
2. **No live data** — same fixture + `unstable_cache` story every indexed-data surface in this
   codebase carries until TASK-31. Not logged as an open issue — scope already assigned to a named
   future TASK.
3. **Collections found by search link to `/collection/[collectionId]`, which doesn't exist yet** —
   already logged as `docs/OPEN_ISSUES.md` Issue #11 (TASK-27); not re-logged, this is its second
   consumer.
4. **No dedicated test for `/search/page.tsx` itself** — matches `/market/page.tsx`'s,
   `/activity/page.tsx`'s, and `/profile/[address]/page.tsx`'s own precedent: a thin Server
   Component composed entirely of already-tested pieces.

## ACCEPTANCE CRITERIA

`NFFC_Development_Plan.md` v3.4 TASK-28:

| Criterion | Status | Evidence |
|---|---|---|
| Búsqueda por composición parcial funciona sobre datos indexados | Met | `search()`'s NFFC facet matches on any component's asset symbol, over in-memory indexed data; verified both by `search.test.ts` and live (`?q=NVDA` → the 2 indexed NFFCs containing NVDA) |

Objective's other three facets (activos, colecciones, wallets) — no separate criterion given, but
all three built and tested: `results.assets`, `results.collections`, `results.wallets`.

## PULL REQUEST

Branch `task/TASK-28-search`, based on **`main`** (TASK-00…27).

**PR: (to be filled in once opened)**
**CI: (to be filled in once green)**

**Do not merge** — Project Lead reviews and authorizes.

## NEXT TASK

**TASK-29 — Offers** (`NFFC_Development_Plan.md` v3.4, depende de TASK-19, TASK-24). Block-authorized
— proceeding directly per the Project Lead's instructions, chained on this PR once merged.
