# TASK 23 REPORT

## STATUS

COMPLETED

`pnpm verify` (lint · typecheck · test · build) green locally — **62 files, 324 tests** (305 → +19).
`pnpm contracts:build` / `pnpm contracts:test` unchanged — **172 Solidity tests** (TASK-23 touches
no `.sol`). Worker entry point smoke-tested live (`pnpm worker workers/nav-materializer/index.ts`)
— see BUILD. Both CI jobs on PR #29 pass — run `34625127529`. See PULL REQUEST.

## OBJECTIVE

Calculate and persist `Reference NAV = Σ(weight × normalizedPrice)`: current NAV, history, and
performance windows (`NFFC_Development_Plan.md` v3.2 TASK-23).

## SCOPE NOTE

TASK-23 depends on TASK-22 (Price Engine), merged. Like TASK-22, part of the data contract already
existed: `domain/valuation/types.ts` (`ReferenceNav`, `NavPoint`, `PerformancePoint`) was scaffolded
in TASK-02, unimplemented. This TASK adds the compute layer (pure, fully tested), the persistence
ports + Postgres-backed implementations + migration (`db/README.md` explicitly assigns "price/NAV"
schema ownership to TASK-23), and the orchestrating worker
(`docs/conventions.md` §3's own table names "NAV materialization" as a worker concern). Two
independent gaps remain outside this TASK's control: no deployed `RepresentationRegistry` (TASK-31)
and no source of which tokens to materialize a NAV for (the indexer, TASK-24) — the worker's `index.ts`
honestly reports the second and exits, while `materialize.ts`'s actual orchestration logic is
complete and fully unit-tested regardless. Full detail: `docs/valuation.md`.

## CHANGES

### `domain/valuation/compute-reference-nav.ts` (new) — `computeReferenceNav`

`Σ(weightᵢ × normalizedPriceᵢ)`, pure. Degraded-input policy, documented and tested: a **stale**
price still contributes its last-known value (matching `NffcMarketPanel`'s, TASK-15, existing
assumption that a NAV number renders *alongside* a stale-warning badge, not hidden behind one); a
**missing** price contributes `0` (nothing to fall back to). Either way `degraded: true`, and the
resolved sources are still recorded in `basis` — the computation's inputs stay reproducible.

### `domain/valuation/compute-performance.ts` (new) — `computePerformanceWindows`

1D/7D/30D/SINCE_MINT `PerformancePoint[]`, the exact shape `PerformanceWindows` (TASK-15) already
renders. A fixed window appears only once history reaches back that far; `SINCE_MINT` anchors on
the point at or before `mintedAt`, or the earliest recorded point when history starts after mint —
an honest proxy, not a fabricated anchor.

### `domain/ports/price-store.ts`, `domain/ports/nav-store.ts` (new)

`PriceStore` and `NavStore` — mirror `docs/spec/09-data-model.md`'s `price_point` / `nav_point`
tables exactly. `NavStore.record` takes the full `ReferenceNav` (with `basis`); `getHistory` returns
the leaner `NavPoint` projection.

### `db/migrations/0002_price_nav.sql` (new)

Creates `price_point` and `nav_point` per `docs/spec/09-data-model.md`, with the same
`UNIQUE`/idempotency keys the spec names.

### `infra/valuation/postgres-price-store.ts`, `postgres-nav-store.ts` (new)

Real implementations over `infra/db`'s pool. Not unit-tested directly — the same boundary
`infra/db/pool.ts` itself already accepts (`docs/conventions.md` §4). `multiplier` is reconstructed
from `raw`/`normalized`/`priceDecimals` on read rather than given its own column, since the spec's
`price_point` schema doesn't have one (it's a representation-config fact, not an observation).

### `workers/nav-materializer/` (new)

`materialize.ts`'s `materializeReferenceNav(deps)` — fetch prices (`PriceOracle`) → persist every
observation (`PriceStore`) → compute (`computeReferenceNav`) → persist (`NavStore`), all I/O
injected, fully unit-tested. `config.ts` + `index.ts` mirror `workers/provider-sync/`'s exact shape:
thin, untested glue that logs why it's skipping (no deployed registry, then — even once
configured — no token source yet) rather than running against nothing.

### `tests/support/fakes.ts` (modified)

`createInMemoryPriceStore` / `createInMemoryNavStore` — in-memory fakes for the two new ports,
following the existing `createFakeChainReader`/`createStaticPriceOracle` pattern.

### Docs

`docs/valuation.md` (new) — the compute layer, the persistence layer, the orchestration, and what
remains deferred. `infra/README.md`, `workers/README.md` — new rows. `README.md` — status line, doc
link.

## FILES CREATED

```
domain/valuation/compute-reference-nav.ts
domain/valuation/compute-reference-nav.test.ts
domain/valuation/compute-performance.ts
domain/valuation/compute-performance.test.ts
domain/ports/price-store.ts
domain/ports/nav-store.ts
db/migrations/0002_price_nav.sql
infra/valuation/postgres-price-store.ts
infra/valuation/postgres-nav-store.ts
infra/valuation/index.ts
workers/nav-materializer/materialize.ts
workers/nav-materializer/materialize.test.ts
workers/nav-materializer/config.ts
workers/nav-materializer/index.ts
docs/valuation.md
docs/reports/TASK-23-REPORT.md
```

## FILES MODIFIED

```
domain/index.ts        export valuation/compute-reference-nav, valuation/compute-performance
domain/ports/index.ts  export PriceStore, NavStore
infra/index.ts          export createPostgresPriceStore, createPostgresNavStore
tests/support/fakes.ts  + createInMemoryPriceStore, createInMemoryNavStore
infra/README.md         valuation/ row
workers/README.md       nav-materializer/ row
README.md               status line + doc link
```

Branch is based on `main` (TASK-00…22) — see PULL REQUEST.

## TESTS

`pnpm test` → Vitest, **62 files, 324 tests** (19 new):

```
compute-reference-nav.test.ts (6)   the weighted sum over a fully-priced composition; a single
                                     100% component equals its own price; EmptyNavCompositionError
                                     on no components; missing price -> 0 contribution + degraded;
                                     stale price -> still contributes its value + degraded; fully
                                     fresh -> not degraded
compute-performance.test.ts (10)    empty history -> []; only SINCE_MINT with <1 day of history;
                                     1D appears once reachable, 7D/30D not yet; all four windows
                                     with 40+ days of history; unsorted input handled; positive and
                                     negative % change; a zero base reports 0, not NaN/Infinity;
                                     SINCE_MINT anchors at-or-before mintedAt, or falls back to the
                                     earliest recorded point when history starts after mint
materialize.test.ts (3)             happy path (computes, persists every fetched price, persists
                                     one NAV point, basis has 2 entries); degraded when the oracle
                                     omits a requested representation (contributes 0, only the
                                     resolved price is ever persisted); degraded but still uses the
                                     value when a returned price is itself stale
```

`pnpm contracts:test` → **172 Solidity tests**, unchanged (TASK-23 adds no `.sol`).

## BUILD

`pnpm build` green — unchanged, same **11 routes** (TASK-23 adds no UI surface).

Smoke-tested live: `pnpm worker workers/nav-materializer/index.ts` →

```
{"level":"warn", ..., "reason":"missing/invalid CONTRACT_REPRESENTATION_REGISTRY",
 "msg":"not configured — skipping (deploy RepresentationRegistry, TASK-31)"}
```

Exits cleanly, no crash — confirms the worker's config-check path is live and correct even with no
`.env` configured.

## LINT / TYPECHECK

Clean, with one naming fix along the way: `computeReferenceNav`'s empty-composition error was
originally named `EmptyCompositionError`, colliding (via the wildcard barrel `domain/index.ts`) with
`domain/nffc/segment.ts`'s existing error of the same name for an unrelated condition. Renamed to
`EmptyNavCompositionError` — different modules, different meanings, now distinct names.

## SECURITY

STEP 5 AUDIT (`docs/spec/08-security-principles.md`):

| Concern | This TASK |
|---|---|
| **Always "Reference NAV", never bare "value"** (acceptance) | Enforced at the type level: the computed result's type is literally `ReferenceNav`, not `Value` (TASK-02); every consuming UI component (TASK-15) already only ever renders that label |
| **Persisted history reproducible from stored oracle prices** (acceptance) | `materializeReferenceNav` persists every fetched `NormalizedPrice` to `PriceStore` *before* computing the NAV; `NavStore.record` keeps the full `basis` (the exact `PriceSource`s used); `price_point`'s columns (`raw_price`, `normalized_price`, `price_decimals`, `source`, `observed_at`) are exactly what's needed to re-derive the same computation later |
| Stale/degraded data never silently presented as fresh | `degraded` is computed and persisted alongside every NAV point, never dropped; the policy for missing vs. stale inputs is explicit and tested, not implicit |
| Worker fails safe when unconfigured | `index.ts` logs and exits rather than crashing or looping when the registry address, RPC, or database aren't set — verified live |
| No real network/database in tests (`docs/conventions.md` §4) | `createInMemoryPriceStore`/`createInMemoryNavStore`/`createStaticPriceOracle`/`createFakeLogger` throughout; the two Postgres-backed store files have no test of their own, matching `infra/db/pool.ts`'s own precedent |

## PERFORMANCE

`computeReferenceNav` and `computePerformanceWindows` are both `O(n)` over the composition / history
respectively — no unbounded loops, no N+1 pattern. `materializeReferenceNav` makes one
`PriceOracle.getPrices` batch call (itself `Promise.all` per TASK-22) plus one store write per
resolved price plus one NAV-point write — linear in component count (≤20).

## KNOWN ISSUES

1. **Not wired into `/api/nffc/[tokenId]/market` or `NffcMarketPanel`.** That route still returns
   `emptyMarketSnapshot(...)`, honestly. Wiring a live value needs both a token source (TASK-24)
   and a deployed registry (TASK-31) — the engine itself doesn't need either to be correct and
   tested, but a real caller does. Not logged as an open issue — scope already assigned to named
   future TASKs.
2. **`multiplier` is reconstructed on read, not stored.** `docs/spec/09-data-model.md`'s
   `price_point` schema has no `multiplier` column; the value is exactly recoverable from the three
   columns that exist (`normalized = (raw/10^decimals) × multiplier`), so nothing is lost, but a
   reader has to know to do that derivation rather than reading a column directly. Documented in
   both the code and `docs/valuation.md`; not logged as an open issue — this follows the spec's
   schema exactly rather than deviating from it.
3. **`materializeReferenceNav` makes 2×N-ish RPC/DB calls, not batched.** Same deliberate,
   documented scope boundary TASK-22 already accepted for `PriceOracle.getPrices` — acceptable at
   V1 scale (≤20 components), a reasonable later optimization.
4. **The Postgres-backed stores are genuinely untested against a live database** — the same
   boundary `infra/db/pool.ts` (TASK-04) itself already accepts; real correctness is an integration
   concern (TASK-31/37), not a new gap this TASK introduces.

## ACCEPTANCE CRITERIA

`NFFC_Development_Plan.md` v3.2 TASK-23:

| Criterion | Status | Evidence |
|---|---|---|
| Always shown as "Reference NAV", never bare "value" | Met | The computed type is `ReferenceNav` (TASK-02); every consuming UI component already only renders that label |
| Persisted history is reproducible from stored oracle prices | Met | Every fetched price is persisted to `PriceStore` before the NAV is computed; `NavStore` keeps the full `basis` (exact sources used); `materialize.test.ts` proves the persist-then-compute order directly |

## PULL REQUEST

Branch `task/TASK-23-reference-nav-engine`, based on **`main`** (TASK-00…22).

**PR: https://github.com/victorhmlz/nffc-protocol/pull/29** — base `main`.
**CI: https://github.com/victorhmlz/nffc-protocol/actions/runs/34625127529 — success** — both jobs.

**Do not merge** — Project Lead reviews and authorizes.

## NEXT TASK

**TASK-24 — Indexer** (`NFFC_Development_Plan.md` v3.2). Blocked until the Project Lead merges this
PR and authorizes TASK-24.
