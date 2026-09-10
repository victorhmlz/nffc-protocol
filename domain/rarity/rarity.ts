/**
 * Static rarity (TASK-14) — the birth rarity of an NFFC from the structure of
 * its composition alone: fewer components and more weight concentration ⇒ rarer.
 * Deterministic, computable from on-chain data only — no price, no oracle
 * (`docs/spec/10-version-boundaries.md`; `docs/static-rarity.md`).
 *
 * This is the off-chain mirror of `contracts/lib/StaticRarityLib.sol` and is
 * kept **bit-identical** to it: the WAD score is computed in `bigint` with the
 * same integer arithmetic and truncation, then exposed as a `[0, 1]` float.
 * Shared reference vectors pin the parity (`rarity.test.ts` ↔
 * `StaticRarityLib.t.sol`).
 */
import { BPS_TOTAL, MAX_COMPONENTS } from "@domain/nffc/composition";
import type { TokenId } from "@domain/nffc/composition";
import type {
  StaticRarity,
  StaticRarityInputs,
  StaticRarityScore,
} from "@domain/rarity/types";

/** Fixed-point 1.0 — the on-chain score's scale. */
export const RARITY_WAD = 1_000_000_000_000_000_000n;
/** `(10_000)^2` — Σwᵢ² when one component holds all the weight. */
const BPS_SQ_TOTAL = BigInt(BPS_TOTAL) * BigInt(BPS_TOTAL);
const MAX_N = BigInt(MAX_COMPONENTS);
const CONC_WEIGHT = 3n;
const COUNT_WEIGHT = 2n;

export class StaticRarityInputError extends Error {
  override name = "StaticRarityInputError";
  constructor() {
    super("Cannot compute static rarity for a composition with no components.");
  }
}

/**
 * The exact on-chain integer score in `[0, RARITY_WAD]` — equals
 * `NFFC.getStaticRarity(tokenId)` and `StaticRarityLib.score(weightsBps)`.
 * Callers guarantee `1 ≤ n ≤ 20`, every weight `> 0`, `Σ = 10_000` (I1–I4).
 */
export function staticRarityWad(weightsBps: readonly number[]): bigint {
  const n = BigInt(weightsBps.length);
  if (n === 0n) throw new StaticRarityInputError();
  if (n === 1n) return RARITY_WAD;

  let hhi = 0n;
  for (const w of weightsBps) {
    const wb = BigInt(w);
    hhi += wb * wb;
  }

  const num = hhi * n;
  let concNorm = 0n;
  if (num > BPS_SQ_TOTAL) {
    concNorm = ((num - BPS_SQ_TOTAL) * RARITY_WAD) / (BPS_SQ_TOTAL * (n - 1n));
    if (concNorm > RARITY_WAD) concNorm = RARITY_WAD;
  }

  const countNorm = ((MAX_N - n) * RARITY_WAD) / (MAX_N - 1n);

  return (
    (concNorm * CONC_WEIGHT + countNorm * COUNT_WEIGHT) /
    (CONC_WEIGHT + COUNT_WEIGHT)
  );
}

/** The rarity as a `[0, 1]` number (`staticRarityWad / 1e18`); higher = rarer. */
export function staticRarityScore(
  weightsBps: readonly number[],
): StaticRarityScore {
  return (Number(staticRarityWad(weightsBps)) /
    Number(RARITY_WAD)) as StaticRarityScore;
}

/** Build the full `StaticRarity` record for a token. */
export function computeStaticRarity(
  tokenId: TokenId,
  inputs: StaticRarityInputs,
): StaticRarity {
  return { tokenId, score: staticRarityScore(inputs.weightsBps), inputs };
}
