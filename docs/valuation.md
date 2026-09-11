# Reference NAV Engine (TASK-23)

`Reference NAV = Σ(weightᵢ × normalizedPriceᵢ)` — computed, persisted, and turned into performance
windows over TASK-22's `PriceOracle` (`NFFC_Development_Plan.md` v3.2 TASK-23). Depends on TASK-22,
merged.

## Acceptance criteria

- **Always shown as "Reference NAV", never bare "value"** — avoids implying backing.
- **Persisted history is reproducible from the stored oracle prices.**

## The naming discipline is a type, not a convention

`domain/valuation/types.ts` (TASK-02) already named the return type `ReferenceNav`, not `Value`.
`computeReferenceNav` (this TASK) returns exactly that type — every caller that destructures its
result is holding a `ReferenceNav`, and every consuming UI component (`ReferenceNavStat`,
`NffcMarketPanel`, TASK-15) already only ever renders the words "Reference NAV". There is no
code path in this engine that produces or labels a number as bare "value".

## Compute layer (pure, `domain/valuation/`)

- **`computeReferenceNav(tokenId, components, prices, computedAt)`** — the weighted sum. Degraded-
  input policy (`docs/spec/09-data-model.md`'s `nav_point.is_degraded`: "true if any component price
  was stale or missing" — the computation still proceeds, it doesn't abort):
  - A **stale** price still contributes its last-known value — the same assumption
    `NffcMarketPanel` (TASK-15) already made by rendering a NAV number *alongside* its own "stale"
    warning badge, rather than hiding the number.
  - A **missing** price (no observation at all) contributes `0` — there's no value to fall back to.
  - Either way, `degraded: true` and the resolved sources are still recorded in `basis`, so the
    computation's inputs stay fully reproducible regardless.
- **`computePerformanceWindows(history, now, mintedAt)`** — 1D/7D/30D/SINCE_MINT
  `PerformancePoint[]`, the exact shape `PerformanceWindows` (TASK-15) already renders. A fixed
  window (1D/7D/30D) appears only once history actually reaches back that far — a token minted an
  hour ago has no 7D window yet, rather than a fabricated one. `SINCE_MINT` anchors on the point at
  or before `mintedAt` when one exists, or otherwise the earliest recorded point — an honest "since
  we started tracking" proxy when a true since-mint observation predates this engine's own history.

Both are pure and fully unit-tested — no chain, no database, no clock dependency beyond an explicit
`now` parameter.

## Persistence layer

New ports mirror `docs/spec/09-data-model.md`'s tables exactly:

- **`PriceStore`** (`domain/ports/price-store.ts`) — `record`/`getLatest`/`getHistory` over
  `price_point`. This is what makes the reproducibility acceptance criterion checkable: every price
  a NAV was computed from is recorded here first.
- **`NavStore`** (`domain/ports/nav-store.ts`) — `record` takes the full `ReferenceNav` (with
  `basis`, for reproducibility); `getHistory` returns the leaner `NavPoint` projection
  `computePerformanceWindows` and a chart both just need.

`db/migrations/0002_price_nav.sql` creates both tables. `infra/valuation/postgres-price-store.ts` /
`postgres-nav-store.ts` implement the ports over `infra/db`'s pool — thin glue, **not** unit-tested
directly, the same boundary `infra/db/pool.ts` itself already accepts
(`docs/conventions.md` §4: no test touches a real database). `multiplier` isn't its own
`price_point` column (the data-model spec doesn't have one — it's a representation-config fact, not
a market observation) but is exactly reconstructible from the three columns that are:
`normalized = (raw / 10^decimals) × multiplier`.

## Orchestration — `workers/nav-materializer/`

Mirrors `workers/provider-sync/`'s shape exactly: `materialize.ts`'s `materializeReferenceNav(deps)`
is the fully-tested, all-I/O-injected orchestrator (fetch prices → persist every observation →
compute → persist the NAV); `index.ts` is thin, untested glue that builds the real dependencies and
logs why it's skipping rather than running when they aren't ready.

**Not operational yet, on two independent axes:**

1. `RepresentationRegistry` has no deployed address (TASK-31) — `ChainlinkPriceOracle` needs one.
2. There is no source of *which* tokens to materialize a NAV for — that's the indexer (TASK-24).

`index.ts` checks and reports the first; the second is the more fundamental gap right now, so it
logs and exits before ever constructing a `ChainlinkPriceOracle` or a Postgres store, even though
both are ready to wire in. Run it with `pnpm worker workers/nav-materializer/index.ts` — verified
live: exits cleanly with `"not configured — skipping (deploy RepresentationRegistry, TASK-31)"`,
never crashes.

## What's still deferred

- No live wiring into `/api/nffc/[tokenId]/market` or `NffcMarketPanel` — that route still returns
  `emptyMarketSnapshot(...)`. Wiring it needs both TASK-24 (a token source) and TASK-31 (a deployed
  registry) to exist; the engine itself doesn't block on either to be correct and tested.
- No real multicall-batched price fetch — `materializeReferenceNav` calls `PriceOracle.getPrices`
  once per token, which itself is `Promise.all` over per-representation reads (TASK-22's own
  documented, deliberate scope boundary).
