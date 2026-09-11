# TASK 15 REPORT

## STATUS

COMPLETED

`pnpm verify` (lint · typecheck · test · build) green locally — **29 files, 139 tests** (118 → +21).
`pnpm contracts:build` / `pnpm contracts:test` green — **128 Solidity tests**, unchanged (no `.sol`
touched). See PULL REQUEST for CI.

## OBJECTIVE

Display composition, Reference NAV, performance, rarity, and assets in the UI: visualization
components connected to the Price Engine (TASK-22), NAV Engine (TASK-23), and the rarity engines
(TASK-14 and, later, TASK-41) (`NFFC_Development_Plan.md` v3.2 TASK-15; `docs/spec/07-ux-map.md`
§5–6).

## SCOPE NOTE — TASK-15 vs. TASK-21/22/23

TASK-15's own dependency list names TASK-22 (Price Engine) and TASK-23 (NAV Engine), neither of
which exists yet. As with TASK-11/12/13 before it, this TASK ships everything that **doesn't**
require those engines: the presentational components, wired to the exact data contracts TASK-22/23
will fill in (`NffcMarketSnapshot`, `PerformancePoint`), with every acceptance rule (provenance,
loading, error) enforced now and provable with fixtures. Wiring them into a live page with a real
wallet/ownership context is TASK-21 (NFFC detail page); this TASK is the components themselves,
demoed on `/style-guide`.

## CHANGES

### `domain/metadata/metadata.ts` — `NffcMarketSnapshot.performance`

Added `performance: readonly PerformancePoint[]` (from `@domain/valuation/types`, TASK-23's shape)
alongside `referenceNav` / `components`, so one fetch (`/api/nffc/[tokenId]/market`) carries
everything the dynamic UI needs. `emptyMarketSnapshot` defaults it to `[]`. `NffcMarketPanel`
consumes this exact type.

### `src/lib/format-age.ts` (new)

`formatAge(observedAtSeconds, nowMs?)` — a pure "2m ago" / "3h ago" / "4d ago" formatter, `nowMs`
injectable for deterministic tests. Used everywhere a market datum's age is shown.

### New components (`src/components/ui/`)

- **`ReferenceNavStat`** — the Reference NAV, always labelled as such (never bare "value"). Three
  explicit states: loading (`Skeleton`, `aria-busy`), unavailable (`role="status"` +
  `unavailableReason` or a generic message — never blank), and loaded (value + `source` + age +
  a `Stale` badge when `stale`).
- **`PerformanceWindows`** — 1D / 7D / 30D / Since-mint, each a `Stat` (value = NAV at the window's
  end, delta = signed % change, hint = the window's own provenance age). Loading and
  empty/unavailable states are explicit.
- **`CompositionTable`** — per-component asset / class / provider / weight from `StaticComponentFact`
  (TASK-11) — on-chain data only, no oracle dependency; an explicit loading placeholder instead of
  a blank table.
- **`StaticRarityStat`** — the `[0,1]` score (TASK-14) as a 0–100 index, explicitly noted as
  structural / not market data (no timestamp needed — there is no oracle to attribute).
- **`NffcMarketPanel`** — composes `ReferenceNavStat` + `PerformanceWindows` directly over an
  `NffcMarketSnapshot`, plus a degraded-data warning badge. This is the component "connected to"
  the Price/NAV Engine contract.

All exported from the `@/components/ui` barrel.

### `src/app/style-guide/page.tsx`

New **"Dynamic NFFC UI/Data (TASK-15)"** section: `NffcMarketPanel` in three states (loaded, stale/
degraded, unavailable) plus a standalone loading state, and `CompositionTable` / `StaticRarityStat`
samples. A fixed `DEMO_NOW` keeps the rendered ages stable across builds. `/style-guide` stays
statically prerendered.

### Docs

`docs/design-system.md` — rows for the five new components. `README.md` — status line + rationale.

## FILES CREATED

```
src/lib/format-age.ts
src/lib/format-age.test.ts
src/components/ui/reference-nav-stat.tsx
src/components/ui/reference-nav-stat.test.tsx
src/components/ui/performance-windows.tsx
src/components/ui/performance-windows.test.tsx
src/components/ui/composition-table.tsx
src/components/ui/composition-table.test.tsx
src/components/ui/static-rarity-stat.tsx
src/components/ui/static-rarity-stat.test.tsx
src/components/ui/nffc-market-panel.tsx
src/components/ui/nffc-market-panel.test.tsx
docs/reports/TASK-15-REPORT.md
```

## FILES MODIFIED

```
domain/metadata/metadata.ts                    NffcMarketSnapshot.performance
domain/metadata/metadata.test.ts               emptyMarketSnapshot vector updated
src/app/api/nffc/[tokenId]/market/route.test.ts  assert performance: []
src/components/ui/index.ts                     export the 5 new components
src/app/style-guide/page.tsx                   Dynamic NFFC UI/Data section
docs/design-system.md                          5 new component rows
README.md                                      status line
```

Branch is based on `main` (TASK-00…14) — see PULL REQUEST.

## TESTS

`pnpm test` → Vitest, **29 files, 139 tests** (21 new):

```
format-age.test.ts (5)             just now / minutes / hours / days; clamps a future timestamp
reference-nav-stat.test.tsx (5)    loading state; explicit unavailable reason (custom + generic);
                                    labels "Reference NAV" + shows source + age; Stale badge
performance-windows.test.tsx (3)   loading state; explicit unavailable message (null and empty);
                                    every window rendered with signed % + provenance age
composition-table.test.tsx (2)     explicit loading placeholder, never a blank table; renders
                                    asset/class/provider/weight%
static-rarity-stat.test.tsx (2)    labels + 0-100 index; notes "structural, not market data"
nffc-market-panel.test.tsx (4)     loading state; unavailable reason surfaced; renders NAV +
                                    performance when present; degraded badge when flagged
```

`pnpm contracts:test` → **128 Solidity tests**, unchanged (TASK-15 adds no `.sol`).

## BUILD

`pnpm build` green — 7 routes, `/style-guide` still statically prerendered (all new components are
server-safe — no client-only APIs, no `"use client"` needed).

## LINT / TYPECHECK

Clean. Components import `@domain/metadata`, `@domain/valuation/types` (types only) and existing
`@/components/ui` primitives — no new module-boundary surface.

## SECURITY

STEP 5 AUDIT (`docs/spec/07-ux-map.md` §6, TASK-15 acceptance):

| Concern | This TASK |
|---|---|
| **No market datum without a visible timestamp + oracle attribution** (acceptance) | `MarketDataPoint.source` / `.observedAt` are rendered by `ReferenceNavStat`; every `PerformancePoint`'s `to.at` is rendered by `PerformanceWindows`. Neither component can render a value without them — the fields are required, not optional |
| **Explicit loading and error states, never a blank value** (acceptance) | Every component has a `loading` branch (`Skeleton`, `aria-busy`) and a "no data" branch (`role="status"`, an explicit message); none renders empty markup for missing data |
| Stale data labelled, not hidden | `ReferenceNavStat` shows a `Stale` badge (icon+label, not colour alone) when `data.stale`; `NffcMarketPanel` surfaces `degraded` |
| "Reference NAV" labeling rule | Hardcoded label in `ReferenceNavStat`, never derived from a prop, so it can't drift to bare "value" |
| Segment / rarity derived, never user-set | `StaticRarityStat` takes only a pre-computed `score`; no input path lets a caller set it directly |
| No new client/runtime surface | All five components are plain Server-safe React; no wallet, no fetch, no `"use client"` |

## PERFORMANCE

All components are `O(n ≤ 20)` renders over already-computed data; no client-side computation,
no re-fetch loops. `formatAge` is O(1).

## KNOWN ISSUES

1. **Not wired to a live page.** These are presentational; `/nffc/[tokenId]` (TASK-21) fetches
   `StaticNffcFacts` + `NffcMarketSnapshot` and passes them in, handling ownership/wallet concerns
   this TASK doesn't touch.
2. **Price/NAV Engines don't exist yet.** Every "loaded" state is demoed with fixtures on
   `/style-guide`; the real data path is TASK-22 (prices) / TASK-23 (NAV, performance windows).
3. **Rarity bands are not defined.** `StaticRarityStat` shows the raw 0–100 index; a qualitative
   band (e.g. "Rare") is a product-copy decision, not fixed here.
4. **Currency/denomination is a display placeholder.** Values are shown with a `$` prefix
   (matching the existing style-guide typography sample); the actual NAV denomination is a
   TASK-23/30 decision.

## ACCEPTANCE CRITERIA

`NFFC_Development_Plan.md` v3.2 TASK-15:

| Criterion | Status | Evidence |
|---|---|---|
| No market datum shown without a visible last-update timestamp or without indicating it comes from an oracle | Met | `ReferenceNavStat` / `PerformanceWindows` render `source` + age from required (non-optional) fields |
| Explicit loading and error states, never a blank value with no explanation | Met | Every new component has a `loading` state and an explicit unavailable/empty state; tested in all five suites |
| Visualization components connected to the Price/NAV/rarity engines | Met (contract-level) | Components consume `NffcMarketSnapshot` / `PerformancePoint` / `staticRarityScore` — the exact shapes TASK-22/23/14 produce; live wiring is TASK-21 |

## PULL REQUEST

Branch `task/TASK-15-dynamic-nffc-ui`, based on **`main`** (TASK-00…14).

**PR: <!-- filled in after push -->**

**Do not merge** — Project Lead reviews and authorizes.

## NEXT TASK

**TASK-16 — Wallet (Self-Custody)** (`NFFC_Development_Plan.md` v3.2): wagmi/viem integration,
Robinhood Wallet + generic EVM (WalletConnect) self-custody only, the
`IDLE → AWAITING_WALLET → SIGNING → SUBMITTED → CONFIRMING → SUCCESS/FAILED/REJECTED` state machine,
automatic wrong-network detection with a switch-to-4663 prompt. Depends on TASK-04. Blocked until
the Project Lead merges this PR and authorizes TASK-16.
