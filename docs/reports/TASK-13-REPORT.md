# TASK 13 REPORT

## STATUS

COMPLETED

`pnpm verify` (lint · typecheck · test · build) green locally — **22 files, 106 tests** (88 → +18).
`pnpm contracts:build` / `pnpm contracts:test` green (114 Solidity tests, unchanged — no `.sol`
touched). See PULL REQUEST for CI.

## OBJECTIVE

Immutably record the **weighted market state at the instant of mint** — how far the weighted set was
trading from its all-time highs — sourced from the price oracle, computed once and frozen into the
static metadata, and reproducible by anyone from historical oracle data
(`NFFC_Development_Plan.md` v3.2 TASK-13; `NFFC_Whitepaper.md` §16;
`docs/spec/08-security-principles.md` A8).

## CHANGES

### `domain/mint-condition/mint-condition.ts` (new domain module)

A pure, deterministic computation over oracle observations (the observations themselves come from
the Price Engine + indexer, TASK-22).

- **`OracleObservationAtMint`** — per component: `priceAtMint`, `allTimeHigh`, and provenance
  (`source`, `roundId`, `observedAt`).
- **`MintConditionInput`** — `tokenId`, `mintedAtBlock`, `mintedAt`, `components[]`
  (`representationId` + `weightBps`, on-chain order), `observations[]` (one per component).
- **`computeMintCondition(input) → MintConditionTrait`** — total; throws `MintConditionInputError`
  only on inputs the on-chain invariants I1–I4 plus "one observation per component" already forbid.
  - `drawdownBps_i = clamp(round((1 − priceAtMint_i / allTimeHigh_i) · 10000), 0, 10000)` — a price
    at/above its ATH clamps to 0.
  - `atHigh_i = drawdownBps_i ≤ AT_HIGH_BPS` (100 bps).
  - `weightedDrawdownBps = round(Σ (weightBps_i · drawdownBps_i) / 10000)`.
  - `regime` bucketed via `MINT_CONDITION_REGIME_BOUNDS` (`at-highs` ≤ 149, `near-highs` ≤ 999,
    `mid` ≤ 2 999, `deep-drawdown` ≤ 10 000).
  - `basis[]` records the exact `{ source, roundId, observedAt }` per component — everything needed
    to reproduce the value.
- **`verifyMintCondition(stored, input) → { ok, mismatches[] }`** — re-runs `computeMintCondition`
  on freshly re-fetched inputs and diffs every field (a recompute failure is reported, not thrown).
  This is the acceptance criterion in code.
- **`toMetadataTrait(trait)`** — flattens to `{ "Weighted Drawdown (bps)", "Regime", "Components At
  Highs", "Minted At Block" }` for `StaticNffcFacts.mintConditionTrait`
  (`docs/metadata-architecture.md`).
- `MINT_CONDITION_SCHEMA = "nffc.mintcond.v1"`, `AT_HIGH_BPS`, `MINT_CONDITION_REGIME_BOUNDS`
  exported. Exported from the `@domain` barrel.

### `domain/metadata/metadata.ts`

One comment: `StaticNffcFacts.mintConditionTrait` now points at `toMetadataTrait` from
`@domain/mint-condition`. No type/behaviour change.

### `docs/mint-condition-trait.md` (new)

The public specification: inputs (chain reads + one oracle observation per component), the formula
with every constant, the `MintConditionTrait` shape, and a copy-paste reproduction snippet
(`getComposition` + mint block + `priceEngine.observationsAt` → `verifyMintCondition`).

### Docs

`domain/README.md` — `mint-condition/` row. `README.md` — status line + doc link.

## FILES CREATED

```
domain/mint-condition/mint-condition.ts
domain/mint-condition/mint-condition.test.ts
docs/mint-condition-trait.md
docs/reports/TASK-13-REPORT.md
```

## FILES MODIFIED

```
domain/index.ts          export mint-condition module
domain/metadata/metadata.ts   comment: mintConditionTrait ← toMetadataTrait
domain/README.md         mint-condition/ row
README.md                status line + doc link
```

Branch is based on `main` (TASK-00…12) — see PULL REQUEST.

## TESTS

`pnpm test` → Vitest, **22 files, 106 tests** (18 new in `domain/mint-condition/mint-condition.test.ts`):

```
computeMintCondition   weights the per-component drawdown (60/40, one at ATH, one 20% down → 800 bps);
                       basis carries the exact rounds in component order; whole set at highs → 0 /
                       at-highs; deep drawdown → deep-drawdown; price ≥ ATH clamps to 0; AT_HIGH_BPS
                       threshold; deterministic (deep-equal)
verifyMintCondition    passes on a faithful recompute; flags a tampered weightedDrawdownBps and a
                       tampered per-component drawdownBps; reports (not throws) a recompute failure
rejects                empty composition; weights ≠ 10 000; missing / duplicate observation;
                       non-positive price or ATH; negative mint block
toMetadataTrait        flattens to the four string/number pairs
```

`pnpm contracts:test` → **114 Solidity tests**, unchanged (TASK-13 adds no `.sol`).

## BUILD

`pnpm build` green — 7 routes, unchanged. `pnpm contracts:build` — nothing to compile.

## LINT / TYPECHECK

Clean. `domain/mint-condition` imports only `@domain/nffc/composition` (`BPS_TOTAL`) —
module-boundary rule satisfied. No `src/` consumer yet (the detail page is TASK-21).

## SECURITY

STEP 5 AUDIT (`docs/spec/08-security-principles.md`):

| Concern | This TASK |
|---|---|
| **A8 — deterministic & reproducible from on-chain data, not a black box** | `computeMintCondition` is pure; the full formula + constants are in `docs/mint-condition-trait.md`; `verifyMintCondition` reproduces the value from re-fetched oracle history and diffs it; 18 tests pin it |
| **Acceptance — computed and frozen in the mint flow, never after** | The engine has no I/O; TASK-18 calls it at the correct point and `toMetadataTrait` writes it into the immutable pinned metadata — there is no setter for it anywhere (recorded as the TASK-18 wiring point) |
| **Acceptance — reproducible given the mint timestamp** | `basis[]` records the exact `{ source, roundId, observedAt }` per component; `verifyMintCondition(stored, rebuiltInput)` returns `{ ok, mismatches }` |
| Market data stays out of the immutable identity except as a dated fact | The trait is a *market fact at a fixed block*, not live data — it never updates. `verifyStaticMetadataAgainstChain` (TASK-11) still rejects live-price attributes; `Mint · …` traits are historical and allowed |
| Oracle-degradation risk (R3) | Recorded: if the feed has no round at `mintedAtBlock` or no usable history, TASK-22 must define the fallback; `computeMintCondition` rejects a non-positive price / ATH rather than emitting a bogus trait |
| No secrets, no new deps | Pure TS; imports nothing framework- or Node-specific |

## PERFORMANCE

`computeMintCondition` / `verifyMintCondition` are `O(componentCount ≤ 20)` — a `Map` build and one
division + round per component. No allocation beyond the output arrays.

## KNOWN ISSUES

1. **Oracle observations are TASK-22.** This TASK ships the computation, the verification, and the
   metadata serializer; producing `OracleObservationAtMint` (the round in force at `mintedAtBlock`
   and the feed's historical max) is the Price Engine's job (TASK-22).
2. **Mint-flow wiring is TASK-18.** `computeMintCondition` + `toMetadataTrait` are called at the
   correct point of the mint flow there, before the metadata is pinned.
3. **`allTimeHigh` definition.** "Max normalized price the feed has ever printed up to the mint
   round" — the indexer must materialise this from feed history (TASK-22/24). A shorter lookback
   (e.g. since feed inception on chain 4663) is the practical bound; documented, not yet fixed.
4. **Regime thresholds are provisional.** `at-highs` / `near-highs` / `mid` / `deep-drawdown`
   bounds are centralised in `MINT_CONDITION_REGIME_BOUNDS` for a one-place change; final values
   are a product-copy decision (TASK-21).

## ACCEPTANCE CRITERIA

`NFFC_Development_Plan.md` v3.2 TASK-13:

| Criterion | Status | Evidence |
|---|---|---|
| Trait computed (e.g. distance from the weighted set's all-time highs) using the Chainlink oracle via the Price Engine (TASK-22) | Met (engine) | `computeMintCondition` over `OracleObservationAtMint` (price + ATH from Chainlink); the observation feed is TASK-22 (KNOWN ISSUES #1) |
| Stored as immutable static metadata, generated once at mint | Met (serializer) | `toMetadataTrait` → `StaticNffcFacts.mintConditionTrait`; no setter anywhere; pinned by TASK-18 |
| The trait is computed and frozen in the same mint transaction/flow, never after | Met | Pure engine + `toMetadataTrait`; TASK-18 wires it at the right point (KNOWN ISSUES #2) |
| Reproducible: given the mint timestamp, anyone can verify the original value with historical oracle data | Met | `verifyMintCondition(stored, rebuiltInput)`; `basis[]` carries the exact rounds; `docs/mint-condition-trait.md` §"Reproduction" |

## PULL REQUEST

Branch `task/TASK-13-mint-condition-trait`, based on **`main`** (TASK-00…12).

**PR: https://github.com/victorhmlz/nffc-protocol/pull/16** — base `main`.

**Do not merge** — Project Lead reviews and authorizes.

## NEXT TASK

**TASK-14 — Static Rarity Engine** (`NFFC_Development_Plan.md` v3.2): compute and expose each NFFC's
birth rarity from composition concentration (fewer components + more weight concentration = rarer) —
a documented, deterministic formula computable from on-chain data only, no oracle. Depends on
TASK-09. Blocked until the Project Lead merges this PR and authorizes TASK-14.
