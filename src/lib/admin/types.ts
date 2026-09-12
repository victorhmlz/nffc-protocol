/**
 * Admin-facing (flat, display-ready) snapshot of `FeeConfig.sol`'s on-chain
 * state (TASK-30) — what `/admin/fees` shows and edits. Deliberately flat
 * (mirrors `IFeeConfig`'s getters directly, not a domain type) since nothing
 * outside the admin panel needs this shape — the same reasoning
 * `src/lib/wizard/types.ts`'s `AvailableAsset`/`FeeQuote` already established
 * for wizard-facing, non-domain read shapes.
 */
export interface FeeCurve {
  readonly base: bigint;
  readonly slope: bigint;
}

export interface FeeConfigSnapshot {
  readonly collectionFeeCurve: FeeCurve;
  readonly mintFeeCurve: FeeCurve;
  readonly marketplaceFeeBps: number;
  readonly feeRecipient: string;
  /** Royalty per collection — only collections with a nonzero royalty
   *  configured appear (`FeeConfig.sol`'s mapping default is `0`). */
  readonly royaltyBpsByCollection: Readonly<Record<string, number>>;
}
