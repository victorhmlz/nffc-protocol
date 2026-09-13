# TASK 35 REPORT

## STATUS

COMPLETED

`pnpm verify` (lint · typecheck · test · build) green — **109 files, 527 tests** (was 106/520;
+3 files, +7 tests). 21 routes, unchanged. `pnpm contracts:test` untouched (no `.sol` touched this
TASK). Live smoke test via `pnpm dev`: `SiteHeader`'s nav links, `<main>` landmark, `AdminNav`
coexistence, and the homepage's new copy all verified in the served HTML of `/`, `/market`, and
`/admin`.

## OBJECTIVE

"Eliminar inconsistencias visuales y de interacción acumuladas" (`NFFC_Development_Plan.md` v3.4
TASK-35). Depends on TASK-34, merged. No open issue formally self-nominated with a condition, but
`docs/OPEN_ISSUES.md`'s Issue #13 (logged in TASK-34) explicitly named this TASK as its natural
resolution point if it arrived before the marketplace-redesign TASK — it did, so it's addressed
here (see below).

## CONTEXT CARRIED FORWARD, NOT RE-LITIGATED

The Project Lead's earlier note about an upcoming OpenSea-style marketplace-layout redesign (a
separate future TASK) shaped every decision in this TASK the same way it shaped TASK-34's: every
fix here is built on existing tokens/components, and the new `SiteHeader` is deliberately minimal
(flex-wrap links, no mobile drawer, no new visual language) so it doesn't need to survive that
redesign intact by luck — it's simple enough that it will.

## FINDINGS AND FIXES

### 1. The global site header — resolves `docs/OPEN_ISSUES.md` former Issue #13

**Finding:** three wallet-related widgets were each reachable from only one or two of the project's
12 real routes — `ThemeToggle` from `/` and `/style-guide` only; `ConnectWalletButton` and
`NetworkBanner` from `/portfolio` and `/style-guide` only. Concretely: a user on `/market` trying to
buy, or on `/create` trying to mint, had no way to see they were on the wrong network, no way to
switch theme, and — short of scrolling to find a page-specific control — no visible way to even
confirm their wallet was connected. On top of that, no route linked to any other at all (`AdminNav`,
TASK-31, is the only real nav in the project, scoped to `/admin/*`).

**Fix:** `SiteHeader` (`src/components/layout/site-header.tsx`, new), rendered once in the root
layout above `<main>`. A plain Server Component; the only Client leaves are `NavLink` (new — just
`usePathname()` for `aria-current="page"`, matching `WizardProgress`'s existing `aria-current="step"`
precedent) and the three already-established Client widgets themselves
(`docs/conventions.md` §2: "Keep `use client` at the leaves"). Two now-redundant page-local
instances removed: `/`'s own `<ThemeToggle>`, and `/portfolio`'s second, already-connected
`<ConnectWalletButton>` that used to sit above its content (the contextual "not connected" CTA
inside `/portfolio`'s own empty state stays — that's a purposeful in-content prompt, not a
duplicate). Issue #13 closed (deleted per this doc's own convention, not merely marked resolved).

### 2. `prefers-reduced-motion` — deferred from TASK-03, landed here

`docs/design-system.md` §3 explicitly deferred this to "TASK-30/35"; TASK-30 (Fee Engine) never
touched a TypeScript/CSS file (confirmed in its own report), so it had never actually happened.
Added one global media query in `src/app/globals.css` — the industry-standard kill switch
(`animation-duration`/`transition-duration: 0.01ms !important`, `animation-iteration-count: 1
!important`) rather than `animation: none`, so a spinner still settles to a visible static state
instead of disappearing. Covers every current transition/animation site-wide
(`Button`/`Input`/`Select`/`Skeleton`'s pulse/`TransactionStatus`'s spin/`WizardProgress`'s hover)
without listing them individually. `tests/reduced-motion.test.ts` (new) guards the rule against
future removal.

### 3. Stale homepage copy

`/`'s copy still read "Foundation only; product surfaces land in later tasks" — accurate at
TASK-01, false since TASK-20 (`/market`, the first real product surface) and increasingly so every
TASK since. Updated the copy; swapped the CTA buttons from "Design system"/"Health" (reasonable
TASK-01 bootstrap placeholders — a docs page and a raw JSON endpoint — wrong for a homepage with a
real product behind it now) to "Explore the market"/"Create an NFFC", keeping "Design system" as a
third, secondary link.

## AUDITED AND FOUND ALREADY CONSISTENT (not a fix — a confirmation)

- **Empty-state visual treatment** differs between grid-shaped content (`NffcGrid`/
  `NffcSummaryGrid`, a dashed-border box) and list-shaped content already inside a `Card`
  (`CollectionsList`/`ExposureBreakdown`, plain text) — this is contextually correct, not drift: a
  second box nested inside an existing `Card` border would look worse, not more consistent. Left
  as-is.
- **`Container` padding/gap scales** (`py-10`, `gap-6` vs `gap-8`) are already uniform across every
  top-level page; the gap variance tracks real differences in section density (`/market` has fewer
  distinct sections than `/portfolio`/`/profile`), not accidental drift.
- **Button variants, hover treatments, spacing** were spot-checked across market/portfolio/wizard/
  admin surfaces against `docs/design-system.md`'s own rules and found already compliant — no
  widespread misuse pattern worth a sweep.

## FILES CREATED

```
docs/ui-polish.md
docs/reports/TASK-35-REPORT.md
src/components/layout/site-header.tsx
src/components/layout/site-header.test.tsx
src/components/layout/nav-link.tsx
src/components/layout/nav-link.test.tsx
tests/reduced-motion.test.ts
```

## FILES MODIFIED

```
src/app/layout.tsx           SiteHeader added above <main>
src/app/page.tsx             stale copy fixed; ThemeToggle removed (now global); CTA links updated
src/app/portfolio/page.tsx   NetworkBanner + redundant connected-state ConnectWalletButton removed
src/app/globals.css          global prefers-reduced-motion media query added
docs/design-system.md        SiteHeader/NavLink added to component table; motion section updated
docs/OPEN_ISSUES.md          Issue #13 deleted (resolved)
README.md                    status paragraph; docs/ui-polish.md link
```

No `.sol` file touched. Branch is based on `main` (TASK-00…34) — see PULL REQUEST.

## TESTS

`pnpm test` → **109 files, 527 tests** (+3 files, +7 tests):

```
src/components/layout/nav-link.test.tsx (2)
src/components/layout/site-header.test.tsx (4)
tests/reduced-motion.test.ts (1)
```

`src/app/page.test.tsx` and `src/app/portfolio/page.test.tsx` re-run unchanged (neither asserted on
the removed widgets — verified, not assumed).

`pnpm contracts:test` → unchanged.

## BUILD

`pnpm build` → unchanged, 21 routes.

## LINT / TYPECHECK

Clean.

## SECURITY

No security-relevant surface touched. `SiteHeader` renders no new data path — every widget it hosts
(`NetworkBanner`/`ConnectWalletButton`/`ThemeToggle`) is an unmodified, already-audited component
from TASK-16.

## PERFORMANCE

`SiteHeader` is a Server Component rendered once per route; its only Client leaf beyond the
pre-existing three widgets is `NavLink`, a trivial `usePathname()` read. Negligible cost.

## KNOWN ISSUES

None new. The deliberate scope boundaries from TASK-34 (no automated a11y tool in CI; global nav
kept deliberately minimal ahead of the marketplace redesign) carry forward unchanged — this TASK
built the minimal nav that boundary called for, not a fuller one.

## ACCEPTANCE CRITERIA

`NFFC_Development_Plan.md` v3.4 TASK-35 objective (no bulleted acceptance criteria listed for this
TASK — "eliminar inconsistencias visuales y de interacción acumuladas" is itself the target):

| Finding | Status | Evidence |
|---|---|---|
| No navigation between top-level surfaces (Issue #13) | Resolved | `SiteHeader`, issue deleted |
| Wallet-status widgets reachable from only 1-2 pages | Resolved | Same `SiteHeader` fix |
| `prefers-reduced-motion` never implemented (deferred TASK-30/35) | Resolved | Global `globals.css` rule + test |
| Stale "foundation only" homepage copy | Resolved | `/` copy + CTAs updated |
| Empty-state / spacing / button-variant consistency | Audited, already consistent | See "Audited and found already consistent" |

## PULL REQUEST

Branch `task/TASK-35-ui-polish`, based on **`main`** (TASK-00…34).

**PR:** https://github.com/victorhmlz/nffc-protocol/pull/42
**CI:** green — https://github.com/victorhmlz/nffc-protocol/actions/runs/34751051423
(`lint · typecheck · test · build` pass, 1m52s; `solidity · compile · test` pass, 29s)

**Do not merge** — Project Lead reviews and authorizes.

## NEXT TASK

**TASK-36 — Testnet Deployment** (`NFFC_Development_Plan.md` v3.4, depende de todas las TASKs de
M1). Blocked until the Project Lead merges this PR and authorizes TASK-36. This is the mainnet-
deployment-prerequisite TASK every prior TASK's fixtures have been waiting on — a significant
milestone once authorized.
