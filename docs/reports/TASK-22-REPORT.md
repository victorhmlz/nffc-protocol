# TASK 22 REPORT

## STATUS

COMPLETED

`pnpm verify` (lint · typecheck · test · build) green locally — **59 files, 305 tests** (288 → +17).
`pnpm contracts:build` / `pnpm contracts:test` unchanged — **172 Solidity tests** (TASK-22 touches
no `.sol`). Both CI jobs on PR #27 pass — run `34612154512`. See PULL REQUEST.

## OBJECTIVE

A provider-agnostic price abstraction, with Chainlink as the primary oracle on Robinhood Chain,
covering both Robinhood Stock Tokens and native crypto from day one
(`NFFC_Development_Plan.md` v3.2 TASK-22).

## SCOPE NOTE

TASK-22 depends on TASK-06 (Robinhood Adapter) and TASK-07 (Crypto Adapter), both merged — both
register their representations into the same `RepresentationRegistry` (TASK-05) this engine reads,
which is exactly what makes one engine correct for both without a branch. Unlike most forward-
dependent TASKs in this project, the **data contract already existed**: `domain/ports/price-oracle.ts`
(`PriceOracle`) and `domain/pricing/types.ts` (`NormalizedPrice`) were scaffolded in TASK-02,
unimplemented. `ChainlinkPriceOracle` is their first implementation. `RepresentationRegistry` itself
has no deployed address yet (TASK-31) — every test uses the project's sanctioned fake `ChainReader`
(`docs/conventions.md` §4), the same testing boundary every other `ChainReader`-based read in this
project already accepts. This TASK builds and proves the engine; wiring it into a live UI surface
(via `Reference NAV = Σ(weight × normalizedPrice)`) is TASK-23's job, not this one's — see
`docs/price-engine.md`.

## CHANGES

### `infra/pricing/chainlink-price-oracle.ts` (new) — `ChainlinkPriceOracle`

Implements `PriceOracle`. `getPrice(representationId)`: reads `RepresentationRegistry
.getRepresentation` via `ChainReader` (rejects an inactive representation or one with no oracle feed
configured with named errors), then calls the read feed's standard Chainlink
`AggregatorV3Interface.latestRoundData()`, normalizes `raw / 10^feedDecimals * (multiplier / 1e18)`,
and marks `stale` against `heartbeat + gracePeriodSeconds` (default 300s) — matching
`docs/spec/09-data-model.md`'s `price_point.is_stale` definition exactly. `getPrices` batches via
`Promise.all` over `getPrice`. No asset-class field is ever read or branched on — the on-chain
`Representation` struct this class reads doesn't carry one at all (it lives on
`AssetIdentityRegistry`, a contract this class never touches).

### `tests/support/fakes.ts` (modified) — `createStaticPriceOracle`

A second, wholly independent `PriceOracle` implementation (a plain in-memory map, no `ChainReader`,
no Chainlink) — exists purely to prove the port is a real, swappable contract (see TESTS).

### `tests/support/price-oracle-contract.ts` (new) — the `PriceOracle` contract suite

`runPriceOracleContract(name, make)` — the reusable suite pattern `docs/conventions.md` §4 already
established (`tests/support/*-contract.ts`). Asserts the data contract itself: every `getPrice`
carries `source` + `observedAt`; `getPrices` returns exactly one entry per requested id; an empty
batch returns an empty map, not an error.

### `infra/pricing/index.ts`, `infra/index.ts` (new/modified)

Barrel exports, matching the existing `infra/rpc` pattern.

### Docs

`docs/price-engine.md` (new) — the read path, why "no conditional logic by asset type" is
structural rather than a discipline the code has to maintain, and the extensibility proof.
`infra/README.md` — new row. `README.md` — status line, doc link.

## FILES CREATED

```
infra/pricing/chainlink-price-oracle.ts
infra/pricing/chainlink-price-oracle.test.ts
infra/pricing/index.ts
tests/support/price-oracle-contract.ts
docs/price-engine.md
docs/reports/TASK-22-REPORT.md
```

## FILES MODIFIED

```
tests/support/fakes.ts   + createStaticPriceOracle
infra/index.ts           export ChainlinkPriceOracle + errors
infra/README.md          pricing/ row
README.md                status line + doc link
```

Branch is based on `main` (TASK-00…21) — see PULL REQUEST.

## TESTS

`pnpm test` → Vitest, **59 files, 305 tests** (17 new, all in `chainlink-price-oracle.test.ts`):

```
normalization (2)          raw answer scaled by feedDecimals + multiplier; a fractional multiplier
                            (e.g. a fractional-share representation)
staleness (3)               within heartbeat+grace -> not stale; beyond it -> stale; observedAt is
                            the round's own updatedAt, not the read time
provenance/guard rails (3)  source names the feed address; rejects a non-ACTIVE representation;
                            rejects a representation with no oracle feed configured
batch reads (2)             getPrices keys by id (a duplicate id collapses in the Map, as expected);
                            an empty request makes no chain reads and returns an empty map
provider-agnostic (1)       a Stock-Token-shaped and a native-crypto-shaped representation go
                            through the identical getPrice call path (TASK-22 acceptance)
PriceOracle contract ×2 implementations (6)   the same 3-assertion suite
                            (tests/support/price-oracle-contract.ts), run once against
                            ChainlinkPriceOracle and once against an unrelated in-memory
                            implementation — both pass identically (TASK-22 acceptance: a second
                            oracle provider doesn't break the data contract)
```

`pnpm contracts:test` → **172 Solidity tests**, unchanged (TASK-22 adds no `.sol`).

## BUILD

`pnpm build` green — unchanged, same **11 routes** (TASK-22 adds no UI surface — see SCOPE NOTE).

## LINT / TYPECHECK

Clean.

## SECURITY

STEP 5 AUDIT (`docs/spec/08-security-principles.md`):

| Concern | This TASK |
|---|---|
| **No price is used without source metadata and a timestamp** (acceptance) | Structural: `NormalizedPrice.source`/`observedAt` are non-optional fields on the return type — there is no code path in `getPrice` that constructs the return value without them |
| **The same engine serves both asset types, no conditional logic by type** (acceptance) | Structural: the on-chain `Representation` struct this class reads has no asset-class field to branch on; proven concretely by a test running a Stock-Token-shaped and a crypto-shaped representation through the identical call path |
| **A second oracle provider doesn't break the data contract** (acceptance) | Proven, not asserted: `tests/support/price-oracle-contract.ts`'s suite passes identically against `ChainlinkPriceOracle` and against an unrelated in-memory `PriceOracle` implementation |
| Never a real network/RPC in tests (`docs/conventions.md` §4) | `createFakeChainReader` throughout; no live endpoint, no `.env` dependency for `pnpm test` |
| Stale/degraded data never silently presented as fresh | `stale` is computed from `heartbeat + grace`, always present on `NormalizedPrice`; consumers (TASK-23/15) already carry the vocabulary to act on it (`docs/spec/07-ux-map.md` §6) |

## PERFORMANCE

`getPrices` is `Promise.all` over per-representation `getPrice` calls (2 RPC round-trips each: the
registry read, then the feed read) — correct, parallel, but not a true multicall. Acceptable at V1
scale (a composition is 1–20 components); a multicall-based optimization is a reasonable later
improvement, not attempted here (see KNOWN ISSUES).

## KNOWN ISSUES

1. **`getPrices` makes 2×N RPC calls, not a multicall.** Fine for a composition of ≤20 components at
   V1 scale; a real multicall batching layer would reduce round-trips for larger reads. Not logged
   as an open issue — a known, deliberately deferred optimization, not a correctness gap.
2. **Full ABI-decoding correctness of `getRepresentation`'s nested `oracle` tuple is only provable
   once `RepresentationRegistry` is actually deployed** (TASK-31) — every test uses a fake
   `ChainReader` that returns canned Go-shaped objects directly, never exercising real viem
   ABI decoding. This is the same boundary `infra/rpc/chain-reader.ts` (TASK-04) itself already
   accepts for every read in this project, not a new gap TASK-22 introduces — not logged as an open
   issue.
3. **Not wired into any UI or API route.** `/api/nffc/[tokenId]/market` still returns
   `emptyMarketSnapshot(...)`, unchanged — wiring a live price requires `Reference NAV =
   Σ(weight × normalizedPrice)` (TASK-23), which composes over multiple `NormalizedPrice`s per
   token; that composition, not a raw per-representation price, is what the market route actually
   needs. Deliberately out of scope — TASK-23 is next.
4. **The default 300-second grace period is a provisional choice**, not sourced from any spec
   document (`docs/spec/09-data-model.md` describes the "heartbeat + grace" *shape* but not a
   value). Configurable via `ChainlinkPriceOracleOptions.gracePeriodSeconds`; the caller that wires
   this up for real (TASK-23, or TASK-31's deployment config) can override it. Not logged as an open
   issue — a tunable default, not a design gap requiring explicit review.

## ACCEPTANCE CRITERIA

`NFFC_Development_Plan.md` v3.2 TASK-22:

| Criterion | Status | Evidence |
|---|---|---|
| No price is used without source (oracle) metadata and a timestamp | Met | `NormalizedPrice.source`/`observedAt` are non-optional; no `getPrice` code path omits them |
| The same engine serves Stock Token and crypto prices, no conditional logic by asset type in upper layers | Met | The read `Representation` struct carries no asset-class field to branch on; tested directly with both shapes through the identical path |
| Design supports adding a second oracle provider without breaking the data contract | Met | `runPriceOracleContract` passes identically against `ChainlinkPriceOracle` and an unrelated `createStaticPriceOracle` implementation |

## PULL REQUEST

Branch `task/TASK-22-price-engine`, based on **`main`** (TASK-00…21).

**PR: https://github.com/victorhmlz/nffc-protocol/pull/27** — base `main`.
**CI: https://github.com/victorhmlz/nffc-protocol/actions/runs/34612154512 — success** — both jobs.

**Do not merge** — Project Lead reviews and authorizes.

## NEXT TASK

**TASK-23 — Reference NAV Engine** (`NFFC_Development_Plan.md` v3.2). Blocked until the Project Lead
merges this PR and authorizes TASK-23.
