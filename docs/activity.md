# Activity (TASK-26)

"Timeline on-chain/off-chain indexada de mint, venta, transferencia, listing, oferta"
(`NFFC_Development_Plan.md` v3.2 TASK-26). Depends on TASK-24 (Indexer), merged. Live at
`/activity`.

"On-chain/off-chain" describes where the data comes from (every event originates on-chain)
versus where it's served from (the indexer's off-chain Postgres mirror,
`docs/spec/09-data-model.md` §1) — not two different kinds of activity. There is exactly one
`ActivityEntry` shape, already fixed by TASK-21/24; this TASK doesn't add a new type, it adds a
second query over the same one.

## Surfaces (`docs/spec/07-ux-map.md` §1: "`/activity`, plus per-NFFC / per-wallet timelines")

- **Global feed — `/activity`.** Every event across every token, filterable by kind, NFFC, and
  wallet.
- **Per-NFFC timeline — `/nffc/[tokenId]`.** Already existed (TASK-21's `ActivityTimeline`,
  reading `NffcDetail.activity`) — unchanged.
- **Per-wallet timeline.** Not a separate route: `/activity?wallet=0x...` filters the same global
  feed to one wallet's activity (matching either side — actor or counterparty), the same "indexed
  data + URL-driven filter" shape `/market` already uses rather than a dedicated page per wallet.

## Compute layer (pure, `domain/activity/activity.ts`)

`queryActivity(all, query)` — filter + sort + paginate over `ActivityEntry[]`, reusing that type
directly from `domain/nffc-detail/detail.ts` rather than a parallel shape (mirrors the "one read
model, several queries" pattern `domain/marketplace/listings.ts`, TASK-20, and
`domain/portfolio/portfolio.ts`, TASK-25, already established over `nffc`/`listing`).

- **Sort**: always newest-first by `occurredAt`, ties broken by `blockNumber` descending — matches
  `ActivityEntry`'s own documented convention. No sort option is exposed; a chronological feed has
  one natural order.
- **Filter**: `tokenId` (exact match — the per-NFFC facet), `wallet` (matches `actorAddress` OR
  `counterpartyAddress`, case-insensitive — the per-wallet facet), `kind` (one or more
  `ActivityKind`s). Filters combine with AND.
- **`ActivityEntry.tokenId`** — added in TASK-24 specifically because "the indexer... writes one
  global table across every token and genuinely needs this" — is exactly what makes the
  per-NFFC filter (and the "which NFFC is this?" link in the global feed's UI) possible.

Fully unit-tested (12 tests) — no chain, no database, no clock.

## Data access

- **`src/lib/activity/get-activity.ts`** — `getActivityFeed(query)`, the injection point standing
  in for the indexer: flattens every fixture NFFC's own `activity` array
  (`FIXTURE_DETAILS`, TASK-21 — the same fixture `/nffc/[tokenId]` reads) into one global list and
  runs `queryActivity` over it. Wrapped in `unstable_cache` (`revalidate: 300`), same convention as
  `get-listings.ts` (TASK-20). Swapping this for a real `SELECT ... FROM activity` query (TASK-31)
  is a change local to this one file.
- **`src/lib/activity/parse-query.ts`** — `parseActivitySearchParams`, mirrors
  `parseMarketplaceSearchParams` exactly: malformed/unrecognized values degrade to "no filter",
  never an error.

## UI

- **`ActivityFilters`** (`src/components/activity/`) — wallet + NFFC # text inputs (applied on
  submit) and kind checkboxes (applied immediately, same as `MarketFilters`'s mint-condition
  checkboxes) — URL is the single source of truth, so a shared/bookmarked link reproduces the
  exact same results.
- **`ActivityTimeline`** (`src/components/nffc/`, TASK-21, extended here) — gained two additive,
  optional props: `showTokenLinks` (links each entry to `/nffc/[tokenId]`, off by default so the
  per-token page's existing rendering is byte-for-byte unchanged) and `title` (defaults to
  `"Activity"`). The global feed turns `showTokenLinks` on and passes `title="All events"`; every
  other consumer is untouched.
- **`Pagination`** (`src/components/market/`, TASK-20) — reused as-is; it was already generic
  (`page`/`pageSize`/`total`/`buildHref`), not `IndexedNffcSummary`-specific.

## What's still deferred

- No live data — the same fixture + `unstable_cache` story every indexed-data surface in this
  codebase carries until TASK-31 deploys the contracts and the indexer (TASK-24, merged) has
  something real to read.
- No dedicated test for `/activity/page.tsx` itself — matches `/market/page.tsx`'s own precedent
  (TASK-20): a thin Server Component composed entirely of already-tested pieces (`queryActivity`,
  `getActivityFeed`, `ActivityFilters`, `ActivityTimeline`, `Pagination`).
