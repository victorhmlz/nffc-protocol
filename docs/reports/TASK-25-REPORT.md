# TASK 25 REPORT

## STATUS

COMPLETED

`pnpm verify` (lint · typecheck · test · build) green locally — **73 files, 385 tests** (352 → +33).
`pnpm contracts:build` / `pnpm contracts:test` unchanged — **172 Solidity tests** (TASK-25 touches
no `.sol`). `/portfolio` smoke-tested live via `pnpm dev` — `GET /portfolio` → `200`, renders. PR
not yet opened at time of writing this section — see PULL REQUEST for the final link.

## OBJECTIVE

"NFFCs poseídos, reference value, performance, exposición, colecciones"
(`NFFC_Development_Plan.md` v3.2 TASK-25).

## SCOPE NOTE

TASK-25 depends on TASK-23 (Reference NAV Engine) and TASK-24 (Indexer), both merged. Unlike most
TASKs, the Development Plan gives TASK-25 only an objective line, no criteria table and no
scaffolded domain type from TASK-02 — this is a from-scratch domain design. The concrete facets
built come from `docs/spec/01-product-spec.md` §6.4 ("Portfolio aggregates owned NFFCs, reference
value, performance vs. mint, and exposure by asset and by segment"), plus exposure by collection
(named in the Development Plan's own objective, "...colecciones", not spelled out in the product
spec). `docs/spec/02-domain-model.md` §6 governs the shape of the whole TASK: **portfolio is a
view, not a stored object of record** — nothing here is a new database table; everything is
computed at read time by composing two contracts TASK-25 doesn't own (`IndexedNffcSummary`,
TASK-20; `NffcMarketSnapshot`, TASK-11/22/23) rather than inventing a third near-duplicate shape.
Full detail: `docs/portfolio.md`.

Live wiring is still blocked on the same two axes every market-data surface in this codebase
shares: no deployed contracts (TASK-31) and, until then, `getNffcMarketSnapshot`'s honest
"unavailable" default — `/portfolio` reports this the same way `/nffc/[tokenId]` already does, not
a regression introduced here.

## CHANGES

### `domain/portfolio/portfolio.ts` (new) — `aggregatePortfolio`

Pure aggregation over `PortfolioHolding[]` (`IndexedNffcSummary` × `NffcMarketSnapshot`).
Degraded-input policy mirrors `computeReferenceNav`'s exactly (TASK-23): a stale snapshot still
contributes its value; a missing snapshot contributes `0`; either way `Portfolio.degraded` is set.
Computes `totalReferenceValue`, a value-weighted `performance` per window (1D/7D/30D/SINCE_MINT —
explicitly documented as an honest approximation, not a true money-/time-weighted return), and
`exposureByAsset`/`exposureBySegment`/`exposureByCollection`, each sorted by value descending with
a `weightOfPortfolio` that's `0` (never `NaN`) when the portfolio's total value is `0`.

### `src/lib/portfolio/get-portfolio.ts` (new) — `getPortfolio`

The one injection point standing in for a live indexed query: filters `FIXTURE_LISTINGS`
(`@/lib/marketplace/fixture-listings`, TASK-20 — the same fixture `/market` reads) by owner, fetches
each holding's `NffcMarketSnapshot` via `getNffcMarketSnapshot` (TASK-21's existing per-token seam),
and calls `aggregatePortfolio`.

### `GET /api/portfolio/[address]` (new)

Validates the address (`isAddress`), calls `getPortfolio`, returns JSON,
`Cache-Control: no-store` — same never-cached convention as `/api/nffc/[tokenId]/market`.

### `src/lib/portfolio/use-portfolio.ts` (new) — `usePortfolio`

The client hook `/portfolio` uses. Built with `useReducer`, not several `useState` calls — this
repo's ESLint config (`react-hooks/set-state-in-effect`) flags a bare `useState` setter called
directly in an effect body, even for the ordinary "start loading" case; `transaction-flow.ts`
(TASK-16) already established `dispatch(...)` as the accepted pattern here.

### `src/components/portfolio/` (new) — `PortfolioSummary`, `ExposureBreakdown`, `HoldingsGrid`

`HoldingsGrid` reuses `NffcCard` (TASK-20) directly rather than a near-duplicate card.
`PortfolioSummary` deliberately does **not** reuse `PerformanceWindows` (TASK-15) — that component
shows a per-token absolute NAV figure with no honest portfolio-level equivalent; a percentage next
to the total is the honest representation instead. `ExposureBreakdown` is one generic labelled bar
list, reused for all three exposure facets.

### `src/app/portfolio/page.tsx` (new)

The `/portfolio` Client Component page: not-connected prompt, loading/error states, then
`PortfolioSummary` + three `ExposureBreakdown`s + `HoldingsGrid`. Documented deviation from
`docs/spec/07-ux-map.md`'s "Server for data" classification — see KNOWN ISSUES.

### `src/lib/format-usd.ts` (new)

`$1,234.56` formatting, factored out so this TASK's new components don't inline a fourth copy of
the same format string `ReferenceNavStat`/`PerformanceWindows` already use inline.

### Docs

`docs/portfolio.md` (new). `README.md` — status line, doc link. `docs/OPEN_ISSUES.md` — new Issue
#10 (see KNOWN ISSUES).

## FILES CREATED

```
domain/portfolio/portfolio.ts
domain/portfolio/portfolio.test.ts
src/lib/portfolio/get-portfolio.ts
src/lib/portfolio/use-portfolio.ts
src/lib/portfolio/use-portfolio.test.ts
src/lib/format-usd.ts
src/lib/format-usd.test.ts
src/app/api/portfolio/[address]/route.ts
src/app/api/portfolio/[address]/route.test.ts
src/app/portfolio/page.tsx
src/app/portfolio/page.test.tsx
src/components/portfolio/portfolio-summary.tsx
src/components/portfolio/portfolio-summary.test.tsx
src/components/portfolio/exposure-breakdown.tsx
src/components/portfolio/exposure-breakdown.test.tsx
src/components/portfolio/holdings-grid.tsx
src/components/portfolio/holdings-grid.test.tsx
docs/portfolio.md
docs/reports/TASK-25-REPORT.md
```

## FILES MODIFIED

```
domain/index.ts        export portfolio/portfolio
README.md              status line + doc link
docs/OPEN_ISSUES.md     + Issue #10; "Próximo ID a usar" 10 → 11
```

Branch is based on `main` (TASK-00…24) — see PULL REQUEST.

## TESTS

`pnpm test` → Vitest, **73 files, 385 tests** (33 new):

```
domain/portfolio/portfolio.test.ts (13)       totals and degraded policy (empty portfolio, sums
                                               values, missing snapshot contributes 0 + degraded,
                                               stale snapshot still contributes + degraded);
                                               exposure by asset (splits by weight, sums across
                                               holdings, sorted desc, weight is 0 not NaN at total
                                               0); exposure by segment/collection (groups value +
                                               holding count); performance (value-weights a shared
                                               window, omits a window nobody has, an unavailable
                                               holding contributes to no window)
src/lib/format-usd.test.ts (3)                dollar formatting, zero, rounds to 2 decimals
src/lib/portfolio/use-portfolio.test.ts (3)   no fetch without an address; fetches and resolves;
                                               reports an error on a failed fetch
src/app/api/portfolio/[address]/route.test.ts (3)  rejects a malformed address with 400; returns a
                                               well-formed portfolio for a valid address; returns
                                               an empty portfolio for an address that owns nothing
src/components/portfolio/portfolio-summary.test.tsx (4)  total value + count; degraded badge only
                                               when degraded; explicit "not available yet" message;
                                               each window as a percentage with direction
src/components/portfolio/exposure-breakdown.test.tsx (3)  empty state; label/value/percentage;
                                               optional sublabel
src/components/portfolio/holdings-grid.test.tsx (2)  empty-wallet state; one NffcCard per holding
src/app/portfolio/page.test.tsx (2)           prompts to connect when disconnected; fetches and
                                               renders once connected
```

`pnpm contracts:test` → **172 Solidity tests**, unchanged (TASK-25 adds no `.sol`).

## BUILD

`pnpm build` green — **13 routes** (was 11; `+2`: `/portfolio`, `/api/portfolio/[address]`).
`/portfolio` builds as a static shell (○) — expected, since it's a pure Client Component with no
server-side data dependency of its own; all data comes from the client-side fetch to
`/api/portfolio/[address]`.

Smoke-tested live via `pnpm dev`: `GET /portfolio` → `200`, page renders with the "Portfolio"
heading and connect prompt.

## LINT / TYPECHECK

Clean, with one real fix along the way: `usePortfolio`'s first draft used three separate
`useState` calls and reset them directly inside the effect body (including on the "no address"
early-return branch) — `react-hooks/set-state-in-effect` flagged this. Restructured to
`useReducer` (matching `transaction-flow.ts`'s established pattern) and to return a derived
"cleared" view directly when there's no address, rather than storing it via a matching effect
branch that would only ever be resetting state derivable without one.

## SECURITY

STEP 5 AUDIT (`docs/spec/08-security-principles.md`):

| Concern | This TASK |
|---|---|
| Volatile data never presented as fresh/permanent (`docs/spec/09-data-model.md` §1) | `/api/portfolio/[address]` is `Cache-Control: no-store`; `Portfolio.degraded` is computed and surfaced, never dropped |
| Portfolio is a view, never a stored object of record (`docs/spec/02-domain-model.md` §6) | No new database table; `aggregatePortfolio` is a pure function over already-indexed data, re-derivable at any time |
| Address input validated before use | `GET /api/portfolio/[address]` rejects a malformed address with 400 before calling `getPortfolio` |
| No real network/database in tests (`docs/conventions.md` §4) | Domain tests use hand-built fixtures; the route/hook/page tests fake `fetch` — nothing touches a real server |
| Degraded/missing data never silently zeroed without a flag | Same policy as `computeReferenceNav` (TASK-23): a `0` contribution from a missing snapshot always carries `degraded: true` alongside it |

## PERFORMANCE

`aggregatePortfolio` is `O(n × c)` over holdings (`n`) and components per holding (`c`, ≤20) —
one pass per exposure facet, no nested per-item network/DB calls. `get-portfolio.ts` fetches all
of a wallet's holdings' snapshots in parallel (`Promise.all`), not serially.

## KNOWN ISSUES

1. **`/portfolio` can't fulfill `docs/spec/07-ux-map.md`'s "Server for data" classification.**
   Wallet identity exists only client-side in this self-custody DApp, and `/portfolio` has no
   `[address]` URL segment for a Server Component to read — unlike `/nffc/[tokenId]`. The real
   computation runs server-side (`/api/portfolio/[address]`), but the page itself must be a Client
   Component. Escalated: **`docs/OPEN_ISSUES.md` Issue #10.**
2. **This repo's shared fixture address literals are 38 hex characters, not 40** (a real EVM
   address's length) — never noticed before because nothing previously ran them through real
   `isAddress()` validation; this route is the first to do that. Not escalated — a cosmetic
   test-data blemish with no production effect, documented in `docs/portfolio.md` and worked
   around with correctly-shaped addresses in this TASK's own tests.
3. **No live wiring to a real indexed database or NAV engine** — same two blockers
   (TASK-31 deploy; TASK-22/23's engine needs a live registry) every market-data surface in this
   codebase already carries. Not a new gap; `get-portfolio.ts`'s injection-point design means
   wiring either is a change local to one or two files, not a redesign.
4. **The value-weighted portfolio performance is an approximation, not a true portfolio return.**
   Documented explicitly in `domain/portfolio/portfolio.ts` and `docs/portfolio.md` — computing a
   real money-weighted return would need each holding's full cash-flow history, which nothing in
   this codebase tracks (and isn't in TASK-25's scope to add).

## ACCEPTANCE CRITERIA

`NFFC_Development_Plan.md` v3.2 TASK-25 (objective-only; facets from
`docs/spec/01-product-spec.md` §6.4 and the objective's own "...colecciones"):

| Facet | Status | Evidence |
|---|---|---|
| Owned NFFCs | Met | `Portfolio.holdings` — every `FIXTURE_LISTINGS` entry matching the queried owner |
| Reference value | Met | `Portfolio.totalReferenceValue` — Σ of every holding's current Reference NAV, degraded-input policy tested |
| Performance vs. mint | Met | `Portfolio.performance`'s `SINCE_MINT` window, value-weighted across holdings; per-holding `SINCE_MINT` also available via each holding's own `NffcMarketSnapshot.performance` |
| Exposure by asset | Met | `Portfolio.exposureByAsset`, weight-split per component, summed across holdings |
| Exposure by segment | Met | `Portfolio.exposureBySegment` |
| Exposure by collection | Met | `Portfolio.exposureByCollection` |

## PULL REQUEST

Branch `task/TASK-25-portfolio`, based on **`main`** (TASK-00…24).

**PR: (to be filled in once opened)**
**CI: (to be filled in once green)**

**Do not merge** — Project Lead reviews and authorizes.

## NEXT TASK

**TASK-26 — Activity** (`NFFC_Development_Plan.md` v3.2, depende de TASK-24). Blocked until the
Project Lead merges this PR and authorizes TASK-26.
