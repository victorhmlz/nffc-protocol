/**
 * NFFC composition: the immutable, weighted set of asset representations that
 * defines an NFFC.
 *
 * Mirrors `docs/spec/02-domain-model.md` §2.5 and §4. Types + invariant
 * constants only — enforcement of I1–I8 is `NFFC.sol` (TASK-09) and the
 * off-chain validators are TASK-09 / TASK-17.
 */
import type { Brand } from "@domain/shared/branded";
import type { AssetId, RepresentationId } from "@domain/registry/types";

export type TokenId = Brand<bigint, "TokenId">;
export type CollectionId = Brand<bigint, "CollectionId">;

/** A weight in basis points. `0 < weightBps <= BPS_TOTAL`. */
export type WeightBps = Brand<number, "WeightBps">;

/** Invariant constants (`docs/spec/02-domain-model.md` §4). */
export const MIN_COMPONENTS = 1;
export const MAX_COMPONENTS = 20;
export const BPS_TOTAL = 10_000;

export interface Component {
  readonly assetId: AssetId;
  /** The specific representation chosen for valuation at mint time. */
  readonly representationId: RepresentationId;
  readonly weightBps: WeightBps;
}

/**
 * 1..20 components, unique `assetId`, each `weightBps > 0`, sum exactly
 * `BPS_TOTAL`. The ordering is significant and preserved from the on-chain
 * record. This is a structural type; construction with validation is TASK-09.
 */
export type Composition = readonly Component[];

/**
 * Auto-derived from the providers of a composition's representations
 * (`docs/spec` TASK-08). Never declared by a user.
 */
export type CompositionSegment = "CRYPTO_ONLY" | "STOCK_ONLY" | "MIXED";
