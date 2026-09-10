import type { Address, Hex } from "viem";

/** Chainlink feed descriptor. Mirrors on-chain `IRepresentationRegistry.OracleMetadata`. */
export interface OracleMeta {
  readonly feed: Address;
  readonly heartbeat: number;
  readonly feedDecimals: number;
}

/** One asset as reported by a provider's authoritative list (Robinhood, crypto, …). */
export interface ProviderToken {
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
  readonly toUpsert: readonly ProviderToken[];
  readonly toDeactivate: readonly { representationId: Hex; token: Address }[];
  readonly unchanged: number;
}

export interface ProviderSyncSummary {
  readonly upserted: number;
  readonly deactivated: number;
  readonly unchanged: number;
  readonly at: number;
}
