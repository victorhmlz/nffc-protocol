# Price Engine (TASK-22)

`ChainlinkPriceOracle` (`infra/pricing/chainlink-price-oracle.ts`) — a provider-agnostic price
abstraction, with Chainlink as the primary oracle on Robinhood Chain, covering both Robinhood Stock
Tokens and native crypto from day one (`NFFC_Development_Plan.md` v3.2 TASK-22). Depends on TASK-06
(Robinhood Adapter) and TASK-07 (Crypto Adapter), both merged — both register their representations
into the same `RepresentationRegistry` (TASK-05) this engine reads.

## Acceptance criteria

- **No price is used without source (oracle) metadata and a timestamp.**
- **The same engine serves Stock Token and crypto prices, with no conditional logic by asset type
  in the upper layers.**
- **The design supports adding a second oracle provider without breaking the data contract.**

## The port already existed — TASK-22 is the first implementation

`domain/ports/price-oracle.ts` (`PriceOracle`) and `domain/pricing/types.ts` (`NormalizedPrice`)
were scaffolded in TASK-02, unimplemented, waiting for this TASK. `ChainlinkPriceOracle` is the
first class satisfying that port — the data contract (`getPrice`/`getPrices` → `NormalizedPrice`,
always carrying `source` + `observedAt`) was fixed long before this TASK existed, which is exactly
what makes the third acceptance criterion checkable: **any** conforming implementation, Chainlink or
otherwise, is swappable by construction.

## Read path

```
getPrice(representationId)
  1. RepresentationRegistry.getRepresentation(representationId)   — via ChainReader
       → reverts UnknownRepresentation on-chain if the id doesn't exist (propagates as-is)
       → throws RepresentationInactiveError if status != ACTIVE
       → throws NoOracleConfiguredError if oracle.feed == address(0)
  2. AggregatorV3Interface(oracle.feed).latestRoundData()          — via ChainReader
  3. normalized = (answer / 10^feedDecimals) * (multiplier / 1e18)
  4. stale = (now - round.updatedAt) > (oracle.heartbeat + gracePeriodSeconds)
  5. → NormalizedPrice { representationId, raw, normalized, priceDecimals, observedAt,
                          source: "chainlink:<feed>", multiplier, stale }
```

`gracePeriodSeconds` defaults to 300s, added on top of each feed's own on-chain `heartbeat` —
matching `docs/spec/09-data-model.md`'s `price_point.is_stale` definition
(`now - observed_at > heartbeat + grace`) exactly.

## Provider-agnostic, structurally — not by discipline

The `Representation` struct this engine reads (`RepresentationRegistry.getRepresentation`) carries
no asset-class field at all — asset class lives on `AssetIdentityRegistry`, a separate contract this
engine never reads. There is nothing in the data available to `getPrice` to branch on, so "no
conditional logic by asset type" isn't a rule the code has to follow — it's a rule the code
*can't break*, since the information needed to break it was never in scope.
`chainlink-price-oracle.test.ts` still proves this concretely: a Stock-Token-shaped and a
native-crypto-shaped representation both go through the identical `getPrice` call path in the same
test.

## Extensibility, proven — not asserted

`tests/support/price-oracle-contract.ts` is a reusable contract suite (`docs/conventions.md` §4
pattern) asserting the `PriceOracle` data contract: every `getPrice` carries `source` +
`observedAt`; `getPrices` returns exactly one entry per requested id; an empty batch returns an
empty map, not an error. `chainlink-price-oracle.test.ts` runs this suite twice — once against
`ChainlinkPriceOracle` (backed by a fake `ChainReader`), once against
`createStaticPriceOracle` (`tests/support/fakes.ts`), a trivial in-memory implementation sharing no
code with it at all. Both pass identically, which is the concrete demonstration that a second
oracle provider is a second `PriceOracle` implementation, not a change to this file or to
`NormalizedPrice` — the third acceptance criterion, proven rather than argued.

## What's still a fixture / deferred

- **No deployed `RepresentationRegistry`** (TASK-31) — every test uses `createFakeChainReader`
  (`docs/conventions.md` §4's sanctioned "inject a fake port" pattern), never a live RPC endpoint.
  Real end-to-end correctness (the exact ABI decoding of the nested `oracle` tuple in
  `getRepresentation`'s return) is only provable once TASK-31 deploys the contract — the same
  boundary every other `ChainReader`-based read in this project already accepts (TASK-04's `ChainReader`
  itself is untested against a live chain; this isn't a new gap TASK-22 introduces).
- **`getPrices` is `Promise.all` over individual `getPrice` calls**, not a true multicall — simple
  and correct, but not the most RPC-efficient shape for a large batch. A `multicall`-based
  optimization is a reasonable later improvement, not attempted here (see KNOWN ISSUES in
  `docs/reports/TASK-22-REPORT.md`).
- **Not wired into `/api/nffc/[tokenId]/market`** or any UI surface. That route's own comments
  already say "the NAV / price engines are TASK-22/23" — wiring a live price into it needs
  `Reference NAV = Σ(weight × normalizedPrice)` (TASK-23, `domain/valuation/types.ts`'s already-
  scaffolded `ReferenceNav`), which composes over multiple `NormalizedPrice`s per token. TASK-22 is
  the engine; TASK-23 is where it's actually called from a real code path.
