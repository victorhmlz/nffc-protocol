# Static Rarity

An NFFC's **birth rarity** — the first axis of the two-axis rarity system, fixed at mint. It is
*structural*: derived from the shape of the composition alone, with **no price and no oracle**
(`NFFC_Development_Plan.md` v3.2 TASK-14; `docs/spec/10-version-boundaries.md`). The dynamic,
time-earned axis (performance badges) is V1.5 / TASK-41 and unrelated.

On-chain: `NFFC.getStaticRarity(tokenId)` (via `contracts/lib/StaticRarityLib.sol`). Off-chain
mirror: `staticRarityWad` / `staticRarityScore` in `domain/rarity/rarity.ts` — **bit-identical**,
pinned by shared reference vectors.

## Inputs

Only `weightsBps[]` — the component weights in basis points, in composition order, straight from
`NFFC.getComposition(tokenId)`. `NFFC.mint` guarantees `1 ≤ n ≤ 20`, every weight `> 0`, and
`Σ = 10 000` (invariants I1–I4). An empty list is rejected.

## Constants

```
WAD          = 1e18            // the score's fixed-point scale; 1e18 == "1.0"
MAX_N        = 20              // MAX_COMPONENTS
BPS_SQ_TOTAL = 1e8            // (10_000)^2 — Σwᵢ² when one component holds all the weight
CONC_WEIGHT  = 3, COUNT_WEIGHT = 2   // relative pull of the two axes
```

## Formula

`n == 1` → `WAD` (one component: maximally concentrated *and* maximally scarce).

Otherwise, with all arithmetic in unsigned integers (Solidity `uint256` / TS `bigint`), truncating
on every division:

```
hhi      = Σ wᵢ²                                   // Herfindahl index of the weights, bps²
num      = hhi · n
concNorm = num > BPS_SQ_TOTAL
             ? min( (num − BPS_SQ_TOTAL) · WAD / (BPS_SQ_TOTAL · (n − 1)) , WAD )
             : 0                                    // even split → 0 ; one-holds-all → WAD
countNorm = (MAX_N − n) · WAD / (MAX_N − 1)        // n = 2 → ~WAD ; n = 20 → 0
score     = (concNorm · CONC_WEIGHT + countNorm · COUNT_WEIGHT) / (CONC_WEIGHT + COUNT_WEIGHT)
```

`score ∈ [0, WAD]`; higher = rarer. It is Schur-convex in the weights (moving weight from a lighter
to a heavier component never lowers it) and strictly decreasing in `n` for even splits.

## Reference vectors

Locked in `StaticRarityLib.t.sol` and `domain/rarity/rarity.test.ts`:

| weights (bps) | `score` (WAD) |
|---|---|
| `[10000]` | `1000000000000000000` |
| `[6000, 4000]` | `402947368421052631` |
| `[5000, 5000]` | `378947368421052631` |
| `[9000, 1000]` | `762947368421052631` |
| `[9981, 1×19]` | `597602400000000000` |
| `[500 × 20]` | `0` |

## Reconstructing

```ts
import { staticRarityScore } from "@domain/rarity/rarity";

const components = await nffc.getComposition(tokenId);
const score = staticRarityScore(components.map((c) => c.weightBps)); // [0, 1], === on-chain / 1e18
```

## Downstream

| TASK | Uses this |
|---|---|
| 11 | `StaticNffcFacts.staticRarity` = `staticRarityScore(weights)` in the pinned metadata |
| 15 / 21 | renders the rarity score / band |
| 20 | filters on the indexed `nffc.static_rarity` column, derived off-chain via `domain/rarity` |
