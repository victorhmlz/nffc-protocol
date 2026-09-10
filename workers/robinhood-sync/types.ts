import type { Address, Hex } from "viem";

/** Chainlink feed descriptor for one representation. Mirrors the on-chain
    `IRepresentationRegistry.OracleMetadata`. */
export interface OracleMeta {
  readonly feed: Address;
  readonly heartbeat: number;
  readonly feedDecimals: number;
}

/** One Robinhood Stock Token as reported by the provider's authoritative list. */
export interface RobinhoodToken {
  readonly symbol: string;
  readonly name: string;
  readonly token: Address;
  readonly decimals: number;
  /** Token unit ↔ 1 unit underlying; `10n ** 18n` means 1:1. */
  readonly multiplier: bigint;
  readonly oracle: OracleMeta;
}

/** The subset of an on-chain representation the reconciler needs. */
export interface OnChainRepresentation {
  readonly representationId: Hex;
  readonly token: Address;
  readonly active: boolean;
  readonly oracle: OracleMeta;
}

export interface ReconcilePlan {
  /** Provider tokens to (re)register or refresh on-chain. */
  readonly toUpsert: readonly RobinhoodToken[];
  /** On-chain representations no longer in the provider list — to deactivate. */
  readonly toDeactivate: readonly { representationId: Hex; token: Address }[];
  /** Count of on-chain representations already correct. */
  readonly unchanged: number;
}

export interface RobinhoodSyncSummary {
  readonly upserted: number;
  readonly deactivated: number;
  readonly unchanged: number;
  readonly at: number;
}
