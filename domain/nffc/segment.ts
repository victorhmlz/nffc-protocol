/**
 * Composition segmentation (TASK-08). Each NFFC is `CRYPTO_ONLY`, `STOCK_ONLY`,
 * or `MIXED` — **derived from the composition, never declared**. It reflects the
 * geographic-eligibility difference: any composition containing a tokenized
 * equity inherits the Robinhood Stock Token restriction (not available to US
 * persons; restricted in the UK, Canada, Switzerland and others — Whitepaper
 * §14); a 100%-crypto composition does not.
 *
 * On-chain, `NFFC.sol` (TASK-09) computes this at mint from the registered
 * representations' asset classes and stores it — the minter cannot pass it.
 * Off-chain, the indexer derives it from that on-chain value, never from input.
 */
import type { AssetClass } from "@domain/registry/types";
import type { CompositionSegment } from "@domain/nffc/composition";

export class EmptyCompositionError extends Error {
  override name = "EmptyCompositionError";
  constructor() {
    super("Cannot derive a segment for a composition with no components.");
  }
}

/**
 * Derive the segment from a per-component "is this a native-crypto asset?" flag.
 * The canonical form — matches `CompositionSegmentLib.deriveSegment` on-chain.
 */
export function deriveSegment(
  isCryptoNative: readonly boolean[],
): CompositionSegment {
  if (isCryptoNative.length === 0) throw new EmptyCompositionError();
  const anyCrypto = isCryptoNative.some((v) => v);
  const anyStock = isCryptoNative.some((v) => !v);
  if (anyCrypto && anyStock) return "MIXED";
  return anyCrypto ? "CRYPTO_ONLY" : "STOCK_ONLY";
}

/** Convenience for callers that have each component's `AssetClass`. */
export function deriveSegmentFromClasses(
  classes: readonly AssetClass[],
): CompositionSegment {
  return deriveSegment(classes.map((c) => c === "CRYPTO"));
}

export interface SegmentMeta {
  readonly label: string;
  /** `true` when the segment inherits the Stock Token geographic restriction. */
  readonly geoRestricted: boolean;
  readonly note: string;
}

export const SEGMENT_META: Record<CompositionSegment, SegmentMeta> = {
  CRYPTO_ONLY: {
    label: "Crypto-only",
    geoRestricted: false,
    note: "Composed entirely of native cryptocurrencies. Not subject to the Stock Token geographic restriction.",
  },
  STOCK_ONLY: {
    label: "Stock-only",
    geoRestricted: true,
    note: "Composed entirely of tokenized equities. Not available to US persons; restricted in the UK, Canada, Switzerland and other jurisdictions.",
  },
  MIXED: {
    label: "Mixed",
    geoRestricted: true,
    note: "Contains at least one tokenized equity, so it inherits the Stock Token geographic restriction (US, UK, Canada, Switzerland and others).",
  },
};

export function isGeoRestricted(segment: CompositionSegment): boolean {
  return SEGMENT_META[segment].geoRestricted;
}
