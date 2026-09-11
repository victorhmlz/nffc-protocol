# TASK 26 REPORT

## STATUS

COMPLETED

`pnpm verify` (lint · typecheck · test · build) green locally — **76 files, 415 tests** (385 → +30).
`pnpm contracts:build` / `pnpm contracts:test` unchanged — **172 Solidity tests** (TASK-26 touches
no `.sol`). `/activity` smoke-tested live via `pnpm dev`, both unfiltered and with a `?tokenId=`
filter — see BUILD. Both CI jobs on PR #32 pass — run `34637625394`. See PULL REQUEST.

## OBJECTIVE

"Timeline on-chain/off-chain indexada de mint, venta, transferencia, listing, oferta"
(`NFFC_Development_Plan.md` v3.2 TASK-26).

## SCOPE NOTE

TASK-26 depends on TASK-24 (Indexer), merged. Like TASK-25, the Development Plan gives TASK-26
only an objective line, no criteria table. "On-chain/off-chain" describes where the data
originates (on-chain events) versus where it's served from (the indexer's off-chain Postgres
mirror, `docs/spec/09-data-model.md` §1) — not two kinds of activity; there's exactly one
`ActivityEntry` shape, already fixed by TASK-21/24, reused here rather than duplicated.
`docs/spec/07-ux-map.md` §1 names three surfaces under "Activity": a global `/activity` feed, the
per-NFFC timeline (already built, TASK-21), and "per-wallet timelines" — built here as a
`?wallet=` filter on the same global feed rather than a dedicated route, the same
"indexed data + URL-driven filter" shape `/market` (TASK-20) already established, not a new
pattern invented for this TASK. Full detail: `docs/activity.md`.

## CHANGES

### `domain/activity/activity.ts` (new) — `queryActivity`

Pure filter/sort/paginate over `ActivityEntry[]` (`domain/nffc-detail/detail.ts`, reused directly,
not duplicated). Always sorted newest-first (ties broken by `blockNumber` descending); filters by
`tokenId` (exact), `wallet` (matches `actorAddress` OR `counterpartyAddress`, case-insensitive),
and `kind` (one or more), combined with AND. `ACTIVITY_DEFAULT_PAGE_SIZE`/`ACTIVITY_MAX_PAGE_SIZE`
are prefixed (unlike `domain/marketplace/listings.ts`'s generic names) since both barrel through
the same wildcard `domain/index.ts` export and would otherwise collide.

### `src/lib/activity/get-activity.ts`, `parse-query.ts` (new)

`getActivityFeed` flattens every fixture NFFC's own `activity` array (`FIXTURE_DETAILS`, TASK-21)
into one global list and runs `queryActivity` over it, `unstable_cache`d exactly like
`get-listings.ts` (TASK-20). `parseActivitySearchParams` mirrors `parseMarketplaceSearchParams`
exactly — malformed/unrecognized values degrade to "no filter", never an error.

### `src/components/nffc/activity-timeline.tsx` (modified) — additive

Gained two optional props: `showTokenLinks` (links each entry to `/nffc/[tokenId]`; off by
default, so the existing per-token page's rendering is byte-for-byte unchanged) and `title`
(defaults to `"Activity"`, unchanged). `ActivityEntry.tokenId` — added in TASK-24 specifically
because the indexer's global table needs it — is exactly what makes the link possible.

### `src/components/activity/activity-filters.tsx` (new)

Wallet + NFFC # text inputs (applied on submit) and kind checkboxes (applied immediately) — URL is
the single source of truth, mirroring `MarketFilters` (TASK-20).

### `src/app/activity/page.tsx` (new)

The `/activity` Server Component page: `ActivityFilters` + `ActivityTimeline` (with
`showTokenLinks`) + `Pagination` (`src/components/market/pagination.tsx`, TASK-20, reused as-is —
it was already generic, not `IndexedNffcSummary`-specific).

### Docs

`docs/activity.md` (new). `README.md` — status line, doc link.

## FILES CREATED

```
domain/activity/activity.ts
domain/activity/activity.test.ts
src/lib/activity/get-activity.ts
src/lib/activity/parse-query.ts
src/lib/activity/parse-query.test.ts
src/components/activity/activity-filters.tsx
src/components/activity/activity-filters.test.tsx
src/app/activity/page.tsx
docs/activity.md
docs/reports/TASK-26-REPORT.md
```

## FILES MODIFIED

```
domain/index.ts                                  export activity/activity
src/components/nffc/activity-timeline.tsx        + showTokenLinks, title props (additive)
src/components/nffc/activity-timeline.test.tsx   + 3 tests for the new props
README.md                                        status line + doc link
```

Branch is based on `main` (TASK-00…25) — see PULL REQUEST.

## TESTS

`pnpm test` → Vitest, **76 files, 415 tests** (30 new):

```
domain/activity/activity.test.ts (12)         sort (newest-first, tie-break on blockNumber);
                                               filters (tokenId, wallet-as-actor,
                                               wallet-as-counterparty, case-insensitive wallet,
                                               one-or-more kinds, combined AND, empty kind array =
                                               no filter); pagination (paginates + reports filtered
                                               total, out-of-range page is empty not an error,
                                               clamps a non-positive page to 1)
src/lib/activity/parse-query.test.ts (9)      defaults; tokenId; wallet; one-or-more kinds; ignores
                                               an invalid kind; drops invalid kinds from a mixed
                                               list; page number; invalid page defaults to 1; first
                                               value wins for a repeated single-value param
src/components/activity/activity-filters.test.tsx (6)  renders every control; sets wallet+tokenId
                                               on submit resetting page; clears a param when
                                               emptied; adds/removes a kind checkbox, appending to
                                               or preserving others; preserves an unrelated existing
                                               param
src/components/nffc/activity-timeline.test.tsx (+3)  no per-token link by default; links to the
                                               NFFC when showTokenLinks is set; accepts a custom
                                               title
```

`pnpm contracts:test` → **172 Solidity tests**, unchanged (TASK-26 adds no `.sol`).

## BUILD

`pnpm build` green — **14 routes** (was 13; `+1`: `/activity`).

Smoke-tested live via `pnpm dev`:

```
GET /activity            → 200, "10 events match your filters", kind labels + NFFC # links render
GET /activity?tokenId=1  → 200, "2 events match your filters" (correctly filtered)
```

## LINT / TYPECHECK

Clean on the first pass — no fixes needed this TASK.

## SECURITY

STEP 5 AUDIT (`docs/spec/08-security-principles.md`):

| Concern | This TASK |
|---|---|
| Every entry traces to its on-chain origin (TASK-21 acceptance, unchanged) | `ActivityTimeline` still renders `blockNumber` + `txHash` for every entry, in both the per-NFFC and global contexts |
| Filters operate on indexed data, never a per-item on-chain read (TASK-20 acceptance, same property) | `queryActivity` is a pure in-memory filter; nothing in this TASK calls a chain reader |
| No real network/database in tests (`docs/conventions.md` §4) | Domain tests use hand-built fixtures; `get-activity.ts`/`page.tsx` are thin, untested glue, matching `get-listings.ts`'s own precedent |
| Malformed/stale URLs degrade gracefully | `parseActivitySearchParams` never throws — an invalid kind or page falls back to "no filter" / page 1 |

## PERFORMANCE

`queryActivity` is `O(n log n)` over the full activity set (the sort), same complexity class as
`queryListings`. `get-activity.ts` flattens every fixture NFFC's activity once per cache miss, not
per request (`unstable_cache`, `revalidate: 300`).

## KNOWN ISSUES

1. **No live data** — same fixture + `unstable_cache` story every indexed-data surface in this
   codebase carries until TASK-31 deploys the contracts. Not logged as an open issue — scope
   already assigned to a named future TASK, same reasoning every prior report in this pipeline
   used.
2. **No dedicated test for `/activity/page.tsx`** — matches `/market/page.tsx`'s own precedent
   (TASK-20): a thin Server Component composed entirely of already-tested pieces.
3. **The wallet filter is an exact case-insensitive string match, not checksum-normalized** (no
   `viem.getAddress` round-trip) — consistent with how every other opaque address string in this
   codebase (`IndexedNffcSummary.ownerAddress`, etc.) is already compared; not a new gap.

## ACCEPTANCE CRITERIA

`NFFC_Development_Plan.md` v3.2 TASK-26 (objective-only; surfaces from
`docs/spec/07-ux-map.md` §1):

| Facet | Status | Evidence |
|---|---|---|
| Global timeline of mint/sale/transfer/listing/offer | Met | `/activity`, `queryActivity` over every `ActivityKind` |
| Per-NFFC timeline | Met (pre-existing, TASK-21) | `/nffc/[tokenId]`'s `ActivityTimeline`, unchanged |
| Per-wallet timeline | Met | `/activity?wallet=0x...` — `queryActivity`'s wallet filter, tested for both actor- and counterparty-side matches |

## PULL REQUEST

Branch `task/TASK-26-activity`, based on **`main`** (TASK-00…25).

**PR: https://github.com/victorhmlz/nffc-protocol/pull/32** — base `main`.
**CI: https://github.com/victorhmlz/nffc-protocol/actions/runs/34637625394 — success** — both jobs.

**Do not merge** — Project Lead reviews and authorizes.

## NEXT TASK

**TASK-27 — Profiles** (`NFFC_Development_Plan.md` v3.2, depende de TASK-24, TASK-25). Blocked
until the Project Lead merges this PR and authorizes TASK-27.
