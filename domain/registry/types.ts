/**
 * Asset Identity → Provider → Network → Representation.
 *
 * Mirrors `docs/spec/02-domain-model.md` §2 and `docs/spec/04-contract-interfaces.md`
 * §1–2. Types only — the on-chain registry and its validation are TASK-05.
 */
import type { Address, Brand, UnixSeconds } from "@domain/shared/branded";

export type AssetId = Brand<string, "AssetId">;
export type RepresentationId = Brand<string, "RepresentationId">;
export type ProviderId = Brand<string, "ProviderId">;
export type ChainId = Brand<number, "ChainId">;

/** Descriptive only. Never used to branch privileged logic. */
export type AssetClass = "EQUITY" | "CRYPTO";

export type EntityStatus = "ACTIVE" | "INACTIVE";

export interface AssetIdentity {
  readonly assetId: AssetId;
  readonly symbol: string;
  readonly name: string;
  readonly assetClass: AssetClass;
  readonly status: EntityStatus;
}

/** Descriptive kind; not a switch for core logic. */
export type ProviderKind = "REGULATED_BROKER" | "NATIVE_CRYPTO";

export interface Provider {
  readonly providerId: ProviderId;
  readonly name: string;
  readonly kind: ProviderKind;
  readonly status: EntityStatus;
}

export interface Network {
  readonly chainId: ChainId;
  readonly name: string;
  readonly nativeGasSymbol: string;
  readonly status: EntityStatus;
}

export interface OracleMetadata {
  /** Chainlink aggregator address on the representation's network. */
  readonly feed: Address;
  /** Max acceptable staleness, in seconds. */
  readonly heartbeat: number;
  readonly feedDecimals: number;
}

export interface Representation {
  readonly representationId: RepresentationId;
  readonly assetId: AssetId;
  readonly providerId: ProviderId;
  readonly chainId: ChainId;
  readonly token: Address;
  readonly tokenStandard: "ERC20";
  readonly decimals: number;
  /**
   * Scale between one token unit and one unit of the underlying
   * (fractional-share ratio, etc.). `1` means 1:1.
   */
  readonly multiplier: number;
  readonly oracle: OracleMetadata;
  readonly status: EntityStatus;
  readonly createdAt: UnixSeconds;
  readonly updatedAt: UnixSeconds;
}
