/**
 * Static rarity: the birth rarity of an NFFC, from composition concentration
 * (fewer components + more weight concentration = rarer). On-chain inputs only,
 * no oracle (`docs/spec/10-version-boundaries.md`, TASK-14). The formula and
 * its implementation are TASK-14.
 *
 * The dynamic/earned rarity axis (performance badges) is V1.5 (TASK-41) and is
 * deliberately not modelled here.
 */
import type { Brand } from "@domain/shared/branded";
import type { TokenId, WeightBps } from "@domain/nffc/composition";

/** Normalised to `[0, 1]`; higher = rarer. Exact scale defined in TASK-14. */
export type StaticRarityScore = Brand<number, "StaticRarityScore">;

export interface StaticRarityInputs {
  readonly componentCount: number;
  /** Component weights in basis points, as stored on-chain. */
  readonly weightsBps: readonly WeightBps[];
}

export interface StaticRarity {
  readonly tokenId: TokenId;
  readonly score: StaticRarityScore;
  readonly inputs: StaticRarityInputs;
}
