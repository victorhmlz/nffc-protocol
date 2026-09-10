# TASK 14 REPORT

## STATUS

COMPLETED

`pnpm verify` (lint · typecheck · test · build) green locally — **23 files, 118 tests** (106 → +12).
`pnpm contracts:build` / `pnpm contracts:test` green — **128 Solidity tests** (114 → +14). See PULL
REQUEST for CI.

## OBJECTIVE

Compute and expose each NFFC's **birth rarity** from composition concentration — fewer components +
more weight concentration ⇒ rarer — as a documented, deterministic formula computable from on-chain
data only, with no price and no oracle (`NFFC_Development_Plan.md` v3.2 TASK-14;
`docs/spec/10-version-boundaries.md`; `docs/spec/08-security-principles.md`).

## CHANGES

### `contracts/lib/StaticRarityLib.sol` (new)

`library` with a single `pure` function `score(uint16[] memory weightsBps) → uint256` in `[0, WAD]`
(`WAD = 1e18`), `error EmptyComposition`. Formula (all `uint256`, truncating division):

- `n == 1` → `WAD`.
- `hhi = Σ wᵢ²`; `concNorm = min((hhi·n − 1e8)·WAD / (1e8·(n−1)), WAD)` when `hhi·n > 1e8`, else 0
  — an even split → 0, one-holds-all → `WAD`.
- `countNorm = (20 − n)·WAD / 19` — `n = 2` → ~`WAD`, `n = 20` → 0.
- `score = (concNorm·3 + countNorm·2) / 5`.

Overflow-checked: `hhi ≤ 20·9999² ≈ 2e9`; the widest intermediate is `< 4e28`, far under
`type(uint256).max`.

### `contracts/NFFC.sol`

`getStaticRarity(tokenId)` — was a `virtual` hook returning 0; now copies the token's immutable
weights into a `uint16[]` and returns `StaticRarityLib.score(...)`. No storage, no oracle; the value
is stable for the token's life because the composition is. `virtual` dropped (it is a real
implementation now).

### `domain/rarity/rarity.ts` (new)

The off-chain mirror, **bit-identical** to the Solidity lib (same integer arithmetic in `bigint`):

- `staticRarityWad(weightsBps) → bigint` — equals `NFFC.getStaticRarity` / `StaticRarityLib.score`.
- `staticRarityScore(weightsBps) → number` in `[0, 1]` (`wad / 1e18`) — for
  `StaticNffcFacts.staticRarity` and the UI.
- `computeStaticRarity(tokenId, inputs) → StaticRarity`.
- `RARITY_WAD`, `StaticRarityInputError`. Exported from the `@domain` barrel.

### `docs/static-rarity.md` (new)

The public spec: inputs (chain reads only), constants, the formula, the properties (Schur-convex in
the weights, decreasing in `n`), the six reference vectors, and a reconstruction snippet.

### Docs

`contracts/README.md` — `StaticRarityLib` row. `domain/README.md` — `rarity/rarity.ts` row.
`domain/metadata/metadata.ts` — `StaticNffcFacts.staticRarity` comment now points at
`staticRarityScore`. `README.md` — status line + doc link.

## FILES CREATED

```
contracts/lib/StaticRarityLib.sol
contracts/lib/StaticRarityLib.t.sol
domain/rarity/rarity.ts
domain/rarity/rarity.test.ts
docs/static-rarity.md
docs/reports/TASK-14-REPORT.md
```

## FILES MODIFIED

```
contracts/NFFC.sol             getStaticRarity → StaticRarityLib.score over the stored weights
contracts/NFFC.t.sol           happy-path assertion + 4 static-rarity tests
contracts/README.md            StaticRarityLib row
domain/index.ts                export rarity/rarity
domain/rarity/types.ts         (unchanged)
domain/metadata/metadata.ts    staticRarity comment
domain/README.md               rarity/rarity.ts row
README.md                      status line + doc link
```

Branch is based on `main` (TASK-00…13) — see PULL REQUEST.

## TESTS

`pnpm test` → Vitest, **23 files, 118 tests** (12 new in `domain/rarity/rarity.test.ts`):

```
parity          6 reference vectors — [10000], [6000,4000], [5000,5000], [9000,1000],
                [9981,1×19], [500×20] — match StaticRarityLib.sol exactly
structure       more concentration is rarer; fewer components is rarer (even splits); never > WAD;
                empty throws
staticRarityScore  [0,1] mapping; computeStaticRarity record shape
```

`pnpm contracts:test` → **128 Solidity tests** (14 new):

```
StaticRarityLib.t.sol (10)  the same 5 exact vectors; concentration & component-count monotonicity;
                            score ≤ WAD across n = 1..20; a fuzz test (bounded + Schur-convex under a
                            1-bps shift from the lightest to the heaviest component); empty reverts
NFFC.t.sol (4)              getStaticRarity == StaticRarityLib.score over the stored weights;
                            1 component → 1e18; 20 even → 0; a concentrated mint is rarer than a flat one
```

## BUILD

`pnpm build` green — 7 routes, unchanged. `pnpm contracts:build` — `hardhat compile` clean, solc
0.8.34 (`StaticRarityLib` added; `NFFC` recompiled).

## LINT / TYPECHECK

Clean. `domain/rarity/rarity.ts` imports only `@domain/nffc/composition` (`BPS_TOTAL`,
`MAX_COMPONENTS`, `TokenId`, `WeightBps`) and `@domain/rarity/types` — module-boundary rule
satisfied. The rarity error was named `StaticRarityInputError` to avoid a barrel collision with
`@domain/nffc/segment`'s `EmptyCompositionError`.

## SECURITY

STEP 5 AUDIT (`docs/spec/08-security-principles.md`):

| Concern | This TASK |
|---|---|
| **Deterministic, documented, on-chain-data-only, no oracle** (acceptance) | `StaticRarityLib.score` / `staticRarityWad` are pure integer functions of the weights; `docs/static-rarity.md` gives the full formula + vectors; `getStaticRarity` reads nothing but the stored composition |
| **Structural, not market rarity** (acceptance) | The formula has no price / NAV / time input; it is a pure function of `weightsBps`. The dynamic axis is TASK-41 and separate |
| Immutability | `getStaticRarity` is a `view` over the write-once composition — no setter, no storage; stable for the token's life |
| On-chain ↔ off-chain parity | `bigint` mirror with 6 shared exact vectors in both test suites; a divergence fails CI on both jobs |
| Overflow | `hhi ≤ ~2e9`, widest intermediate `< 4e28`; well under `uint256` max. Weight squares use `uint256(w) * w` (not `uint16 * uint16`) |
| No secrets, no new deps | Pure Solidity / TS |

## PERFORMANCE

`StaticRarityLib.score` / `getStaticRarity` are `O(n ≤ 20)` — one squaring per component plus a
handful of `uint256` ops; a `view`, so no mint-time gas. `domain/rarity` is the same in `bigint`.

## KNOWN ISSUES

1. **Weights, not values.** Concentration is measured on basis-point weights (the mint-time
   allocation), never on live market value. That is the intent — static rarity is structural — but
   worth stating: a composition that is "even by weight" is scored as unconcentrated even if one
   asset later dominates by price.
2. **Axis weighting is provisional.** `CONC_WEIGHT : COUNT_WEIGHT = 3 : 2` and the `1e8`
   normalisation constants are centralised in `StaticRarityLib` / `rarity.ts`; final tuning +
   rarity-band cutoffs (e.g. "top 1%") are a product decision surfaced in TASK-15 / TASK-20.
3. **No on-chain storage.** `getStaticRarity` recomputes on read. Cheap (`view`, `n ≤ 20`) and the
   composition is immutable so the value never changes; the indexer materialises
   `nffc.static_rarity` off-chain via `domain/rarity` for filtering (TASK-20).

## ACCEPTANCE CRITERIA

`NFFC_Development_Plan.md` v3.2 TASK-14:

| Criterion | Status | Evidence |
|---|---|---|
| Documented, deterministic rarity formula, computable from on-chain data only | Met | `docs/static-rarity.md` (formula + constants + vectors); `StaticRarityLib.score` (pure, weights-only); `getStaticRarity` reads only the stored composition |
| Does not depend on price or oracle — structural, not market rarity | Met | No price / NAV / oracle / time input anywhere in `StaticRarityLib` or `domain/rarity`; pure function of `weightsBps` |
| Compute and expose each NFFC's birth rarity | Met | `NFFC.getStaticRarity(tokenId)` returns the WAD score; `domain/rarity` mirrors it for off-chain / metadata use |

## PULL REQUEST

Branch `task/TASK-14-static-rarity`, based on **`main`** (TASK-00…13).

**PR: <!-- filled in after push -->**

**Do not merge** — Project Lead reviews and authorizes.

## NEXT TASK

**TASK-15 — Dynamic NFFC UI / Data** (`NFFC_Development_Plan.md` v3.2): visualisation components for
composition, reference value, performance, rarity and assets, wired to the Price Engine (TASK-22),
NAV Engine (TASK-23) and the rarity engines — every market datum with a visible last-update
timestamp and oracle attribution, explicit loading/error states. Depends on TASK-11, TASK-14,
TASK-22, TASK-23. Blocked until the Project Lead merges this PR and authorizes TASK-15.
