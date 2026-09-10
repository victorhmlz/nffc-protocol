# Mint-Condition Trait

An NFFC is marked, once and immutably, with the **weighted market state at the instant of mint** —
how far the weighted set was trading from its all-time highs. It is a public market fact, not a
promise (`NFFC_Whitepaper.md` §16). Established in TASK-13.

Reference implementation: `domain/mint-condition/mint-condition.ts` (`computeMintCondition`). The
value is frozen into the static metadata (`docs/metadata-architecture.md`,
`StaticNffcFacts.mintConditionTrait`, via `toMetadataTrait`) and is never written again.

## Inputs

| | Source |
|---|---|
| `components[]` — `{ representationId, weightBps }`, in order | `NFFC.getComposition(tokenId)` |
| `mintedAtBlock`, `mintedAt` | the `NFFCMinted` / `Transfer` event |
| one `OracleObservationAtMint` per component | the Price Engine + indexer (TASK-22), reading the Chainlink aggregator |

`OracleObservationAtMint = { representationId, priceAtMint, allTimeHigh, source, roundId, observedAt }`

- `priceAtMint` — the feed's normalized price at the round in force at `mintedAtBlock`.
- `allTimeHigh` — the maximum normalized price the feed has ever printed, up to and including that
  round.
- `source` / `roundId` / `observedAt` — exact provenance, recorded in the trait's `basis` so the
  value can be reproduced.

`computeMintCondition` throws `MintConditionInputError` only on inputs the on-chain invariants
I1–I4 plus "one observation per component" already forbid (empty, weights ≠ 10 000, weight ≤ 0,
missing / duplicate observation, non-positive price or ATH).

## Formula

Per component `i`:

```
drawdownBps_i = clamp( round( (1 - priceAtMint_i / allTimeHigh_i) * 10000 ), 0, 10000 )
atHigh_i      = drawdownBps_i <= 100            // AT_HIGH_BPS — within 1% of the ATH
```

A price at or above its ATH clamps to `0` (a fresh high is zero drawdown).

Weighted:

```
weightedDrawdownBps = round( Σ ( weightBps_i * drawdownBps_i ) / 10000 )
componentsAtHigh    = count of atHigh_i
```

Regime (`weightedDrawdownBps`, inclusive upper bounds — `MINT_CONDITION_REGIME_BOUNDS`):

| regime | ≤ bps |
|---|---|
| `at-highs` | 149 |
| `near-highs` | 999 |
| `mid` | 2 999 |
| `deep-drawdown` | 10 000 |

All arithmetic is standard IEEE-754 `f64` on the supplied decimal inputs, then integer `round`.

## Output — `MintConditionTrait` (`schema: "nffc.mintcond.v1"`)

`tokenId`, `mintedAtBlock`, `mintedAt`, `weightedDrawdownBps`, `regime`, `componentsAtHigh`,
`components[] { representationId, weightBps, drawdownBps, atHigh }`, and
`basis[] { representationId, source, roundId, observedAt }`.

`toMetadataTrait(trait)` flattens it to `{ "Weighted Drawdown (bps)", "Regime", "Components At
Highs", "Minted At Block" }` for `StaticNffcFacts.mintConditionTrait`; `buildStaticNffcMetadata`
turns those into `Mint · …` attributes.

## Reproduction (acceptance)

The trait is computed and frozen in the mint flow (TASK-18), never after. Anyone can verify it:

```ts
import { computeMintCondition, verifyMintCondition } from "@domain/mint-condition/mint-condition";

// 1. rebuild the inputs from chain history — NOT from the stored trait
const components = await nffc.getComposition(tokenId);          // representationId + weightBps
const { mintedAtBlock, mintedAt } = await indexer.mintOf(tokenId);
const observations = await priceEngine.observationsAt(components, mintedAtBlock); // TASK-22

// 2. recompute and compare
const check = verifyMintCondition(storedTrait, { tokenId, mintedAtBlock, mintedAt, components, observations });
// check.ok === true, check.mismatches === []
```

`verifyMintCondition` re-runs `computeMintCondition` on the re-fetched inputs and diffs every field;
a tampered stored value lists the exact mismatch.

## Downstream

| TASK | Uses this |
|---|---|
| 18 | calls `computeMintCondition` at the right point of the mint flow; `toMetadataTrait` → the pinned metadata |
| 20 | filters on `mint_condition_trait` (indexed, `docs/spec/09-data-model.md`) |
| 21 | renders the trait on the NFFC detail page, with its `basis` provenance |
| 22 | supplies `OracleObservationAtMint` (price + ATH + round) from Chainlink |
