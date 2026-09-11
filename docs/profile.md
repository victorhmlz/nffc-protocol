# Profiles (TASK-27)

"Perfiles de creador/coleccionista — creado, poseído, coleccionado, listado, actividad"
(`NFFC_Development_Plan.md` v3.4 TASK-27). Depends on TASK-24 (Indexer) and TASK-25 (Portfolio),
both merged. Live at `/profile/[address]`.

Built with `NFFC_Whitepaper.md` §18 (V1.5 Social Layer, added in the same governance-doc update
that authorized this TASK) already in context — the whitepaper explicitly anchors the future
reputation/verification/posts work to "los perfiles de creador/coleccionista ya existentes (§
Profile, TASK-27)". Nothing from §18 (TASK-48–52) is built here; this page is the surface those
future TASKs will extend.

## Acceptance

Like TASK-25/26, the Development Plan gives TASK-27 only an objective line. The five facets built
are exactly the five named in that line: creado (created), poseído (owned), coleccionado
(collections), listado (listed), actividad (activity).

## Compute layer (pure, `domain/profile/profile.ts`)

`buildProfile(address, allNffcs, recentActivity)` composes two contracts TASK-27 doesn't own:
`IndexedNffcSummary` (`domain/marketplace/listings.ts`, TASK-20 — the same indexed `nffc`/`listing`
mirror `/market` and `/portfolio` already read) and `ActivityEntry`
(`domain/nffc-detail/detail.ts`, queried per-wallet by `domain/activity/activity.ts`, TASK-26).

- **`created`** / **`owned`** — `IndexedNffcSummary[]` filtered by `creatorAddress` /
  `ownerAddress`, case-insensitive, newest-minted first.
- **`listed`** — filtered to an *active* listing where this wallet is the seller.
- **`collections`** — derived from `created`, grouped by `collectionId`, sorted by count
  descending. **Not** a real query over `docs/spec/09-data-model.md`'s `collection` table — the
  indexer doesn't populate that table (`docs/OPEN_ISSUES.md` Issue #9, TASK-24). This is an honest
  proxy: a collection with zero NFFCs minted into it by this wallet wouldn't appear. TASK-27 is
  the second consumer to hit this already-logged gap, not a new one.
- **`recentActivity`** — passed straight through, unfiltered/unsorted by this module; the caller
  (`get-profile.ts`) is responsible for calling `queryActivity` with the right wallet filter first.

Fully unit-tested (9 tests) — no chain, no database, no clock.

## Data access — `src/lib/profile/get-profile.ts`

`getProfile(address)` composes `FIXTURE_LISTINGS` (TASK-20's fixture, the same one `/market` and
`/portfolio` read) with `getActivityFeed` (TASK-26, filtered by wallet, capped at the 20 most
recent entries — the full paginated history is one click away at `/activity?wallet=<address>`).
Wrapped in `unstable_cache`, same as `get-nffc-detail.ts` (TASK-21) — unlike `/portfolio`
(personal, wallet-connected, deliberately uncached), a profile is public and shareable
(`docs/spec/07-ux-map.md`: "No" wallet needed to view), so caching it like `/market` is the right
default.

## Why `/profile/[address]` *can* be real Server-first (unlike `/portfolio`)

This resolves `docs/OPEN_ISSUES.md`'s former Issue #10, which named TASK-27 as the point to
evaluate it: `/profile/[address]` has an address **in its own URL**, so a Server Component can
render it directly from `params` — no client-side wallet dependency needed, the same shape
`/nffc/[tokenId]` already uses. `/portfolio` can't do this (no URL segment; wallet identity is
client-only in this self-custody DApp). `docs/spec/07-ux-map.md` §1 has been corrected to reflect
this precisely (Portfolio's row now says "Client (see note¹)"; the note explains why), and Issue
#10 is closed — see `docs/reports/TASK-27-REPORT.md`.

## UI

- **`ProfileHeader`** (`src/components/profile/`) — truncated address, and role badges
  (**Creator**/**Collector**) derived strictly from `profile.created`/`profile.owned` being
  non-empty — never self-declared, the same rule `NFFC_Whitepaper.md` §18 states for the upcoming
  reputation system (TASK-48), established here first since this is where roles are first shown.
- **`CollectionsList`** — links each collection to `/collection/[collectionId]`, a route named in
  `docs/spec/07-ux-map.md` that no TASK currently builds — see `docs/OPEN_ISSUES.md` Issue #11.
- **`NffcSummaryGrid`** (`src/components/nffc/`, generalized from TASK-25's `HoldingsGrid`) — one
  grid component reused for all three of Created/Owned/Listed, rather than a third near-duplicate.
  `/portfolio`'s call site was updated to match, with no visible change to that page.
- **`ActivityTimeline`** (TASK-21/26) — reused as-is with `showTokenLinks`, plus a "See full
  activity" link to `/activity?wallet=<address>` when there's anything to see.

## What's still deferred

- No live data — same fixture story every indexed-data surface in this codebase carries until
  TASK-31.
- `collections` is a proxy, not a real query (Issue #9).
- `/collection/[collectionId]` doesn't exist yet (Issue #11).
