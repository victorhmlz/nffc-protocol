# Portfolio (TASK-25)

"NFFCs poseídos, reference value, performance, exposición, colecciones" (`NFFC_Development_Plan.md`
v3.2 TASK-25) — the connected wallet's holdings, aggregated. Depends on TASK-23 (Reference NAV
Engine) and TASK-24 (Indexer), both merged. Live at `/portfolio`.

`docs/spec/02-domain-model.md` §6 is explicit: **portfolio is a view, not a stored object of
record** — nothing here is its own database table. Everything is computed at read time from
already-indexed data (`domain/portfolio/portfolio.ts`).

## Acceptance

`NFFC_Development_Plan.md` v3.2 TASK-25 lists an objective, not a criteria table (unlike most
TASKs) — the concrete facets adopted here come from `docs/spec/01-product-spec.md` §6.4: "Portfolio
aggregates owned NFFCs, reference value, performance vs. mint, and exposure by asset and by
segment." This TASK also adds exposure by collection, named in the Development Plan's own
objective line ("...exposición, colecciones") but not spelled out in the product spec.

## Compute layer (pure, `domain/portfolio/portfolio.ts`)

`aggregatePortfolio(ownerAddress, holdings, asOf)` composes two contracts TASK-25 doesn't own,
rather than inventing a third "owned NFFC" shape:

- **`IndexedNffcSummary`** (`domain/marketplace/listings.ts`, TASK-20) — the indexer's `nffc` (+
  `nffc_component`, `listing`) mirror. The same indexed table backs both `/market` (unfiltered) and
  `/portfolio` (filtered to one owner) — one read model, two queries.
- **`NffcMarketSnapshot`** (`domain/metadata/metadata.ts`, TASK-11, filled in by TASK-22/23) — the
  per-token Reference NAV + performance windows `/nffc/[tokenId]` already renders.

Degraded-input policy mirrors `computeReferenceNav` exactly (TASK-23): a holding with a stale
snapshot still contributes its last-known value; a holding with no snapshot at all
(`referenceNav: null`) contributes `0`. Either way `Portfolio.degraded` is set.

What it computes:

- **`totalReferenceValue`** — Σ of every holding's current Reference NAV.
- **`performance`** — one `PortfolioPerformancePoint` per window (1D/7D/30D/SINCE_MINT), a
  **value-weighted average** of each contributing holding's own `change` for that window (weighted
  by the holding's value at the window's end). Documented explicitly as an honest approximation,
  **not** a true money-weighted or time-weighted portfolio return — that would need each holding's
  full cash-flow history, which nothing in this codebase tracks. A window with no contributing
  holding is omitted entirely, not shown as `0%`.
- **`exposureByAsset`** — each holding's value split across its components by `weightBps`, summed
  across holdings that share an asset. Sorted by value descending.
- **`exposureBySegment`** / **`exposureByCollection`** — value and holding count grouped by
  `segment` / `collectionId`. Sorted by value descending.
- **`weightOfPortfolio`** on every exposure row — `value / totalReferenceValue`, `0` (never `NaN`)
  when the total is `0`.

Fully unit-tested (13 tests) — no chain, no database, no clock beyond the `asOf` parameter.

## Data access

- **`src/lib/portfolio/get-portfolio.ts`** — `getPortfolio(ownerAddress)`, the one injection point.
  Filters `FIXTURE_LISTINGS` (`@/lib/marketplace/fixture-listings`, TASK-20 — the same fixture
  `/market` reads) by `ownerAddress`, fetches each held token's snapshot via
  `getNffcMarketSnapshot` (TASK-21 — the same per-token seam `/nffc/[tokenId]` uses), and calls
  `aggregatePortfolio`. Wiring a live indexed query (TASK-24, merged, but not yet backed by a
  deployed contract — TASK-31) or a live NAV engine (TASK-22/23, same blocker) is a change local to
  this one file and to `get-nffc-market-snapshot.ts`, respectively — nothing downstream changes.
- **`GET /api/portfolio/[address]`** (`src/app/api/portfolio/[address]/route.ts`) — validates the
  address (`viem`'s `isAddress`), calls `getPortfolio`, returns JSON, `Cache-Control: no-store`
  (portfolio data is exactly as volatile as Reference NAV, for the same reason).
- **`src/lib/portfolio/use-portfolio.ts`** — the client hook `/portfolio` uses to fetch the
  connected wallet's portfolio. Uses `useReducer`, not several `useState` calls —
  `react-hooks/set-state-in-effect` (this repo's ESLint config) flags a bare `useState` setter
  called directly in an effect body, even for the ordinary "start loading" case;
  `src/lib/wallet/transaction-flow.ts` (TASK-16) already established `dispatch(...)` as this
  codebase's accepted way to synchronize state from an effect.

## Why `/portfolio` is a Client Component, not SSR

`docs/spec/07-ux-map.md` §1 classifies `/portfolio` "Server for data + Client for actions" — the
same split `/nffc/[tokenId]` uses. That split isn't reachable here as literally stated:
`/portfolio` carries no `[address]` URL segment, and in this self-custody DApp wallet identity
exists only client-side (`useAccount()`) — there's no session a Server Component could read. The
closest honest equivalent, and what's built: the actual computation runs server-side (behind
`/api/portfolio/[address]`), while the page itself is a thin Client Component whose only job is
knowing which address to ask for. Flagged as `docs/OPEN_ISSUES.md` Issue #10 rather than silently
deviating from the documented split.

## UI (`src/components/portfolio/`)

- **`PortfolioSummary`** — total Reference Value + a degraded badge (never hiding the number, same
  convention as `NffcMarketPanel`, TASK-15) + the value-weighted performance windows. Deliberately
  doesn't reuse `PerformanceWindows` (TASK-15) — that component shows each window's absolute NAV
  (`to.value`), a per-token figure with no honest portfolio-level equivalent; showing a percentage
  next to the total above is the honest representation.
- **`ExposureBreakdown`** — one generic labelled bar list, reused for asset/segment/collection.
  Every row prints its exact value and percentage — a bar's width is never the only signal
  (data-viz rule: identity isn't color/geometry-alone).
- **`NffcSummaryGrid`** (`src/components/nffc/`, generalized in TASK-27 from this TASK's original
  `HoldingsGrid`) — reuses `NffcCard` (TASK-20) directly rather than a near-duplicate card: a held
  NFFC that's actively listed shows the same Buy-button affordance a marketplace card does
  (relisting is a normal state, `docs/spec/01-product-spec.md` §6.4). `/profile/[address]`
  (TASK-27) needed the exact same "grid of `IndexedNffcSummary`" rendering for its own
  created/owned/listed tabs, so the component moved out of `components/portfolio/` and dropped its
  `Portfolio`-specific prop in favor of a plain `items` array — this page's own call site was
  updated to match, with no visible change.

## Known, documented gap (not this TASK's to fix)

This repo's shared JS/TS fixture address literals (`FIXTURE_LISTINGS`'s `"0x1111…aaaa"` style,
used since TASK-19) are 38 hex characters, one short of a real 20-byte EVM address — never
noticed before because nothing previously ran them through real `isAddress()` validation. This
route is the first to do that, so its own tests use properly-shaped 40-hex-character addresses
instead of reusing the shared fixture literals verbatim. Not escalated to `docs/OPEN_ISSUES.md` —
a cosmetic test-data blemish with no runtime/production effect, not a governance or architecture
contradiction.

## What's still deferred

- No live data — `FIXTURE_LISTINGS` + `getNffcMarketSnapshot`'s honest "unavailable" default, same
  as every other market-data surface until TASK-31 deploys the contracts.
- Issue #10 (ux-map classification) above.
