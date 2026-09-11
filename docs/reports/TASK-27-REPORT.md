# TASK 27 REPORT

## STATUS

COMPLETED

`pnpm verify` (lint · typecheck · test · build) green locally — **79 files, 432 tests** (415 → +17,
net of removing TASK-25's `HoldingsGrid` test in favor of its generalized replacement — see CHANGES).
`pnpm contracts:build` / `pnpm contracts:test` unchanged — **172 Solidity tests** (TASK-27 touches
no `.sol`). `/profile/[address]` smoke-tested live via `pnpm dev`, both a properly-shaped address
(200, empty-state renders) and a malformed one (404) — see BUILD. PR not yet opened at time of
writing this section — see PULL REQUEST for the final link.

## OBJECTIVE

"Perfiles de creador/coleccionista — creado, poseído, coleccionado, listado, actividad"
(`NFFC_Development_Plan.md` v3.4 TASK-27).

## SCOPE NOTE

TASK-27 depends on TASK-24 (Indexer) and TASK-25 (Portfolio), both merged. Authorized as part of a
block authorization covering TASK-27–30 (Profiles, Search, Offers, Fee Engine), each chained on
the previous one's merged PR, each still producing its own report + PR + "do not merge" — see the
Project Lead's instructions in this TASK's originating message for the two conditions attached to
that authorization.

This TASK landed immediately after a separate, small governance-doc PR (`docs/social-layer-v1.5-spec`)
that replaced `NFFC_Whitepaper.md`/`NFFC_Development_Plan.md`/`NFFC_Roadmap.md`/`NFFC_Claude_Master_Prompt.md`
with v1.4/v3.4/v1.3/v2.5, adding the M1.5 Social Layer spec (TASK-48–52) — explicitly requested
*before* TASK-27 so Profiles would be built with Whitepaper §18 already in context, since §18
itself anchors the future reputation/verification/posts work to "los perfiles... ya existentes (§
Profile, TASK-27)". No TASK-48–52 work starts here.

Like TASK-25/26, the Development Plan gives TASK-27 only an objective line — the five facets built
are exactly the five it names. Full detail: `docs/profile.md`.

## CHANGES

### `domain/profile/profile.ts` (new) — `buildProfile`

Pure composition of `IndexedNffcSummary` (TASK-20) and `ActivityEntry` (TASK-21/24/26) — not a
third parallel type. Filters by `creatorAddress`/`ownerAddress`/listing-seller (case-insensitive,
newest-minted first); derives `collections` from `created`, grouped by `collectionId`. That last
facet is an explicitly-documented proxy: the indexer doesn't populate a real `collection` mirror
table (`docs/OPEN_ISSUES.md` Issue #9, TASK-24) — this is the second consumer of that same
already-logged gap, not a new one.

### `src/lib/profile/get-profile.ts` (new) — `getProfile`

Composes `FIXTURE_LISTINGS` (TASK-20) with `getActivityFeed` (TASK-26, wallet-filtered, capped at
20 entries), `unstable_cache`d like `get-nffc-detail.ts` (TASK-21) — a profile is public/shareable,
unlike `/portfolio`'s deliberately-uncached personal data.

### `src/components/nffc/nffc-summary-grid.tsx` (new) — generalizes TASK-25's `HoldingsGrid`

`/profile/[address]` needed the exact same "grid of `IndexedNffcSummary`" rendering three times
(created/owned/listed) that `/portfolio` already had once (`HoldingsGrid`). Rather than a third
near-duplicate component, `HoldingsGrid`'s `portfolio: Portfolio` prop was generalized to a plain
`items: readonly IndexedNffcSummary[]` + `emptyLabel`, moved to `components/nffc/` (no longer
portfolio-specific), and `/portfolio/page.tsx`'s one call site updated to match
(`items={portfolio.holdings.map(h => h.nffc)}`) — no visible change to that page. The old
`src/components/portfolio/holdings-grid.tsx` (+ its test) is retired, not left as a second copy.

### `src/components/profile/` (new) — `ProfileHeader`, `CollectionsList`

`ProfileHeader` shows **Creator**/**Collector** badges derived strictly from `created`/`owned`
being non-empty — never self-declared, the same rule `NFFC_Whitepaper.md` §18 states for the
upcoming reputation system (TASK-48): role labels "se derivan de actividad on-chain... no son
auto-declaradas". `CollectionsList` links to `/collection/[collectionId]` — a route named in
`docs/spec/07-ux-map.md` that no TASK currently builds (new finding, see KNOWN ISSUES).

### `src/app/profile/[address]/page.tsx` (new)

Real Server Component, ISR (`revalidate = 300`), `isAddress` + `notFound()` guard — the same shape
`/nffc/[tokenId]` (TASK-21) established. `ActivityTimeline` reused with `showTokenLinks` plus a
"See full activity" link to `/activity?wallet=<address>` (TASK-26) when there's anything to show.

### `docs/spec/07-ux-map.md` (modified) — resolves `docs/OPEN_ISSUES.md` Issue #10

Issue #10 (logged in TASK-25) named TASK-27 as the point to evaluate whether `/portfolio` could
ever satisfy the ux-map's "Server for data" classification, or whether the doc should be corrected.
Building `/profile/[address]` — which genuinely achieves real SSR precisely because it has an
address in its own URL — confirms the answer: "Server for data" only ever applied to routes with
an address of their own; `/portfolio` structurally cannot have one in this self-custody DApp.
`docs/spec/07-ux-map.md` §1's Portfolio row is corrected accordingly, with a footnote explaining
why, and **Issue #10 is deleted** (resolved, per `docs/OPEN_ISSUES.md`'s own rule — not marked,
removed).

### `docs/OPEN_ISSUES.md` (modified)

Issue #10 removed (resolved, above). New **Issue #11**: `docs/spec/07-ux-map.md` names
`/collection/[collectionId]` and TASK-50 (M1.5, new) already assumes it exists, but no TASK in the
Development Plan builds it.

### Docs

`docs/profile.md` (new). `docs/portfolio.md` — updated `HoldingsGrid` reference. `README.md` —
status line, doc link, and corrected the long-stale governance-doc version line
(v2.4/v3.2/v1.1/v1.1 → v2.5/v3.4/v1.4/v1.3).

## FILES CREATED

```
domain/profile/profile.ts
domain/profile/profile.test.ts
src/lib/profile/get-profile.ts
src/components/nffc/nffc-summary-grid.tsx
src/components/nffc/nffc-summary-grid.test.tsx
src/components/profile/profile-header.tsx
src/components/profile/profile-header.test.tsx
src/components/profile/collections-list.tsx
src/components/profile/collections-list.test.tsx
src/app/profile/[address]/page.tsx
docs/profile.md
docs/reports/TASK-27-REPORT.md
```

## FILES REMOVED

```
src/components/portfolio/holdings-grid.tsx        superseded by nffc/nffc-summary-grid.tsx
src/components/portfolio/holdings-grid.test.tsx   superseded by nffc/nffc-summary-grid.test.tsx
```

## FILES MODIFIED

```
domain/index.ts             export profile/profile
src/app/portfolio/page.tsx  use NffcSummaryGrid instead of the retired HoldingsGrid
docs/spec/07-ux-map.md      correct Portfolio's rendering classification; resolves Issue #10
docs/OPEN_ISSUES.md         − Issue #10 (resolved); + Issue #11
docs/portfolio.md           update the HoldingsGrid reference
README.md                   status line + doc link + corrected governance version line
```

Branch is based on `main` (TASK-00…26) — see PULL REQUEST.

## TESTS

`pnpm test` → Vitest, **79 files, 432 tests** (17 net new — 19 added, 2 removed with
`holdings-grid.test.tsx`):

```
domain/profile/profile.test.ts (9)                  created/owned filtered independently;
                                                     case-insensitive address match; listed only
                                                     for an active listing by this wallet as
                                                     seller; newest-minted-first sort; empty
                                                     arrays for an unrelated wallet; collections
                                                     grouped + counted from created only (not
                                                     owned); collections sorted by count
                                                     descending; activity passed through as-is
src/components/nffc/nffc-summary-grid.test.tsx (2)  empty-state message; one NffcCard per item
src/components/profile/profile-header.test.tsx (5)  truncated address; neutral badge with no
                                                     activity; Creator badge only when created is
                                                     non-empty; Collector badge only when owned is
                                                     non-empty; both badges together
src/components/profile/collections-list.test.tsx (3) empty state; lists name+count linked to
                                                     /collection/[id]; singular "NFFC" for count 1
```

`pnpm contracts:test` → **172 Solidity tests**, unchanged (TASK-27 adds no `.sol`).

## BUILD

`pnpm build` green — **15 routes** (was 14; `+1`: `/profile/[address]`).

Smoke-tested live via `pnpm dev`:

```
GET /profile/0x1111111111111111111111111111111111aaaa   → 404 (this fixture "address" is only 38
                                                             hex chars — the same pre-existing
                                                             fixture-format blemish TASK-25's
                                                             report already documented; `isAddress`
                                                             correctly rejects it)
GET /profile/0x111111111111111111111111111111111111111a → 200, renders the well-formed empty
                                                             state ("No on-chain activity yet",
                                                             "Hasn't created a collection yet"),
                                                             no "See full activity" link (correctly
                                                             absent — no activity to link to)
GET /profile/not-an-address                              → 404
```

## LINT / TYPECHECK

Clean on the first pass — no fixes needed this TASK.

## SECURITY

STEP 5 AUDIT (`docs/spec/08-security-principles.md`):

| Concern | This TASK |
|---|---|
| Role labels derived from on-chain activity, never self-declared (`NFFC_Whitepaper.md` §18) | `ProfileHeader`'s Creator/Collector badges are strict functions of `profile.created`/`profile.owned` being non-empty; there is no free-text or self-selected role field anywhere in this TASK |
| Owned NFFC display doesn't imply confirmed ownership for any action | `profile.owned` is the same "indexed fast path" `docs/spec/09-data-model.md` §4 describes for read-only display — this page performs no owner-gated action, so no chain confirmation is needed or claimed |
| No real network/database in tests (`docs/conventions.md` §4) | Domain tests use hand-built fixtures; `get-profile.ts`/`page.tsx` are thin, untested glue, matching `get-listings.ts`'s own precedent |
| Malformed address input rejected before any data access | `isAddress` gates the page before `getProfile` is ever called, same as `/api/portfolio/[address]` (TASK-25) |

## PERFORMANCE

`buildProfile` is `O(n)` over the full indexed NFFC set for the created/owned/listed filters, plus
`O(k log k)` for the collections grouping+sort (`k` = this wallet's created count, ≤ n). No
per-item network/DB calls.

## KNOWN ISSUES

1. **`collections` is a proxy, not a real query over a `collection` table** — same already-logged
   gap, `docs/OPEN_ISSUES.md` Issue #9 (TASK-24). Not re-logged; documented in-code and in
   `docs/profile.md`.
2. **`/collection/[collectionId]` doesn't exist** — `CollectionsList` links to it anyway, the same
   forward-reference precedent `NffcCard` (TASK-20) set for `/nffc/[tokenId]` before TASK-21
   existed. Unlike that case, though, no TASK in the Development Plan is currently assigned to
   build it, and TASK-50 (M1.5, new) already assumes it exists. Escalated:
   **`docs/OPEN_ISSUES.md` Issue #11.**
3. **No live data** — same fixture + `unstable_cache` story every indexed-data surface in this
   codebase carries until TASK-31 deploys the contracts. Not logged as an open issue — scope
   already assigned to a named future TASK.
4. **No dedicated test for `/profile/[address]/page.tsx` itself** — matches `/market/page.tsx`'s
   and `/activity/page.tsx`'s own precedent: a thin Server Component composed entirely of
   already-tested pieces.

## ACCEPTANCE CRITERIA

`NFFC_Development_Plan.md` v3.4 TASK-27 (objective-only):

| Facet | Status | Evidence |
|---|---|---|
| Creado (created) | Met | `profile.created` |
| Poseído (owned) | Met | `profile.owned` |
| Coleccionado (collections) | Met, with a documented proxy | `profile.collections`, derived from `created` (Issue #9 applies) |
| Listado (listed) | Met | `profile.listed` |
| Actividad (activity) | Met | `profile.recentActivity`, sourced from TASK-26's `queryActivity` |

## PULL REQUEST

Branch `task/TASK-27-profiles`, based on **`main`** (TASK-00…26).

**PR: (to be filled in once opened)**
**CI: (to be filled in once green)**

**Do not merge** — Project Lead reviews and authorizes.

## NEXT TASK

**TASK-28 — Search** (`NFFC_Development_Plan.md` v3.4, depende de TASK-24). Block-authorized —
proceeding directly per the Project Lead's instructions, chained on this PR once merged.
