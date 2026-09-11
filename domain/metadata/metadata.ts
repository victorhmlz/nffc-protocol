/**
 * Metadata architecture (TASK-11). Two strictly separated layers:
 *
 * 1. **Static metadata** — the ERC-721 JSON an NFFC's `staticMetadataURI` points
 *    at. Immutable: authored once at mint, pinned to content-addressed storage
 *    (IPFS/Arweave), and fully reconstructible from `NFFC.sol` views + the
 *    registries. `verifyStaticMetadataAgainstChain` proves a pinned file matches
 *    chain state with **no backend involved** — an RPC node is enough.
 *
 * 2. **Dynamic market data** — Reference NAV and per-component prices. Volatile,
 *    oracle-sourced, recomputed on read, always carrying `source` + `observedAt`.
 *    Served only by the API (`/api/nffc/[tokenId]/market`); the database caches
 *    it but is never its source of truth, and it never enters layer 1.
 *
 * Mirrors `docs/spec/09-data-model.md` §1 and `docs/spec/07-ux-map.md` §5–6.
 * The generative art is TASK-12, static rarity TASK-14, the mint-condition trait
 * TASK-13, the NAV/price engines TASK-22/23 — this module fixes the shapes and
 * the verification, not those computations.
 */
import type { Hex32 } from "@domain/shared/branded";
import type {
  AssetClass,
  AssetId,
  ProviderId,
  RepresentationId,
} from "@domain/registry/types";
import type { CompositionSegment } from "@domain/nffc/composition";
import { BPS_TOTAL } from "@domain/nffc/composition";

export const STATIC_METADATA_SCHEMA = "nffc.static.v1";

/** A served static-metadata document never changes → cache it hard. */
export const STATIC_METADATA_CACHE_CONTROL =
  "public, max-age=31536000, immutable";
/** Dynamic data is never permanent truth → never cache it as a response. */
export const MARKET_DATA_CACHE_CONTROL = "no-store";

export const MARKET_DATA_NOTICE =
  "Reference NAV and prices are volatile, oracle-sourced, and recomputed on read. They are " +
  "never part of the immutable metadata and are never treated as a permanent source of truth.";

// --------------------------------------------------------------- static layer ---

export interface Erc721Attribute {
  readonly trait_type: string;
  readonly value: string | number;
  readonly display_type?:
    "number" | "boost_percentage" | "boost_number" | "date";
}

/** One composition position, exactly as recorded on-chain at mint. */
export interface StaticComponentFact {
  readonly position: number; // 0-based, on-chain order
  readonly assetId: AssetId;
  readonly assetSymbol: string;
  readonly assetClass: AssetClass;
  readonly providerId: ProviderId;
  readonly representationId: RepresentationId;
  readonly weightBps: number;
}

/**
 * The on-chain-derived facts about an NFFC. Everything here is reproducible from
 * `NFFC.getComposition` / `getCompositionHash` / `getSegment` plus the
 * registries — which is what makes the static metadata backend-independent.
 */
export interface StaticNffcFacts {
  readonly tokenId: string; // decimal string (ERC-721 convention)
  readonly collectionId: string;
  readonly compositionHash: Hex32; // == NFFC.getCompositionHash(tokenId)
  readonly segment: CompositionSegment;
  readonly componentCount: number;
  readonly components: readonly StaticComponentFact[];
  readonly mintedAtBlock: number;
  /**
   * `staticRarityScore(weights)` from `@domain/rarity` — a `[0, 1]` structural
   * score (TASK-14), equal to `NFFC.getStaticRarity(tokenId) / 1e18`. Never
   * market-sourced.
   */
  readonly staticRarity: number | null;
  /**
   * Weighted market-state snapshot frozen at mint — `toMetadataTrait(...)` from
   * `@domain/mint-condition` (TASK-13); `null` until the price engine (TASK-22)
   * feeds it.
   */
  readonly mintConditionTrait: Readonly<Record<string, string | number>> | null;
}

/**
 * ERC-721 metadata JSON (OpenSea-compatible) for an NFFC, plus an `nffc` mirror
 * of the on-chain facts so a verifier needs only this file + an RPC node.
 */
export interface StaticNffcMetadata {
  readonly schema: typeof STATIC_METADATA_SCHEMA;
  readonly name: string;
  readonly description: string;
  readonly image: string; // art URI (ipfs://… / ar://…) — TASK-12
  readonly external_url: string;
  readonly attributes: readonly Erc721Attribute[];
  readonly nffc: StaticNffcFacts;
}

export interface BuildStaticMetadataInput {
  readonly facts: StaticNffcFacts;
  readonly collectionName: string;
  readonly artURI: string;
  readonly externalBaseUrl: string;
  readonly description?: string;
}

/**
 * Assemble the static metadata document from on-chain facts. Pure and
 * deterministic: the same facts always yield byte-identical output via
 * {serializeStaticMetadata}. Callers: the mint flow, the art worker (TASK-12),
 * the indexer (TASK-24).
 */
export function buildStaticNffcMetadata(
  input: BuildStaticMetadataInput,
): StaticNffcMetadata {
  const { facts, collectionName, artURI, externalBaseUrl } = input;

  const attributes: Erc721Attribute[] = [
    { trait_type: "Segment", value: facts.segment },
    {
      trait_type: "Components",
      value: facts.componentCount,
      display_type: "number",
    },
    ...facts.components.map((c): Erc721Attribute => ({
      trait_type: c.assetSymbol,
      value: c.weightBps / 100, // percent
      display_type: "boost_percentage",
    })),
  ];
  if (facts.staticRarity !== null) {
    attributes.push({
      trait_type: "Static Rarity",
      value: facts.staticRarity,
      display_type: "number",
    });
  }
  if (facts.mintConditionTrait) {
    for (const key of Object.keys(facts.mintConditionTrait).sort()) {
      attributes.push({
        trait_type: `Mint · ${key}`,
        value: facts.mintConditionTrait[key]!,
      });
    }
  }

  const plural = facts.componentCount === 1 ? "" : "s";
  return {
    schema: STATIC_METADATA_SCHEMA,
    name: `${collectionName} #${facts.tokenId}`,
    description:
      input.description ??
      `An NFFC — an immutable, weighted composition of ${facts.componentCount} verified on-chain ` +
        `asset representation${plural}. Reference values are provided separately and are not part of ` +
        `this metadata.`,
    image: artURI,
    external_url: `${externalBaseUrl.replace(/\/+$/, "")}/nffc/${facts.tokenId}`,
    attributes,
    nffc: facts,
  };
}

/**
 * Canonical serialization: recursively key-sorted, whitespace-free JSON. These
 * are the exact bytes to pin; the content id (CIDv1 / sha-256) is computed over
 * them by the pinning layer (infra/worker), not here.
 */
export function serializeStaticMetadata(meta: StaticNffcMetadata): string {
  return canonicalJson(meta);
}

function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object")
    return JSON.stringify(value) ?? "null";
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${canonicalJson(v)}`).join(",")}}`;
}

/**
 * The component tuples in on-chain order, shaped for
 * `abi.encode((bytes32 assetId, bytes32 representationId, uint16 weightBps)[])`.
 * `keccak256` of that encoding must equal `facts.compositionHash` — the stronger,
 * hash-level check a verifier with an ABI codec can run on top of
 * {verifyStaticMetadataAgainstChain}.
 */
export function canonicalComponentTuples(
  facts: StaticNffcFacts,
): readonly (readonly [AssetId, RepresentationId, number])[] {
  return facts.components.map(
    (c) => [c.assetId, c.representationId, c.weightBps] as const,
  );
}

// -------------------------------------------------------------- verification ---

/** The minimum chain state a verifier reads to check a pinned metadata file. */
export interface OnChainNffcState {
  readonly tokenId: string;
  readonly compositionHash: Hex32;
  readonly segment: CompositionSegment;
  readonly components: readonly {
    readonly assetId: AssetId;
    readonly representationId: RepresentationId;
    readonly weightBps: number;
  }[];
}

export interface MetadataVerification {
  readonly ok: boolean;
  readonly mismatches: readonly string[];
}

const MARKET_WORDS = /\b(nav|price|value|usd|eur|worth)\b|[$€]/i;

/**
 * Check a static metadata document against on-chain state, using only that
 * document and chain reads — no backend. Also asserts the document carries no
 * market-data attribute (acceptance: volatile data never enters static metadata).
 */
export function verifyStaticMetadataAgainstChain(
  meta: StaticNffcMetadata,
  chain: OnChainNffcState,
): MetadataVerification {
  const m: string[] = [];
  const f = meta.nffc;

  if (meta.schema !== STATIC_METADATA_SCHEMA)
    m.push(`schema: unexpected "${meta.schema}"`);
  if (f.tokenId !== chain.tokenId)
    m.push(`tokenId: metadata ${f.tokenId} != chain ${chain.tokenId}`);
  if (f.compositionHash.toLowerCase() !== chain.compositionHash.toLowerCase()) {
    m.push(
      `compositionHash: metadata ${f.compositionHash} != chain ${chain.compositionHash}`,
    );
  }
  if (f.segment !== chain.segment)
    m.push(`segment: metadata ${f.segment} != chain ${chain.segment}`);
  if (f.componentCount !== f.components.length) {
    m.push(
      `componentCount ${f.componentCount} != components.length ${f.components.length}`,
    );
  }
  if (f.components.length !== chain.components.length) {
    m.push(
      `components length: metadata ${f.components.length} != chain ${chain.components.length}`,
    );
  } else {
    f.components.forEach((c, i) => {
      const o = chain.components[i]!;
      if (c.position !== i)
        m.push(`components[${i}].position ${c.position} != ${i}`);
      if (c.assetId !== o.assetId)
        m.push(`components[${i}].assetId ${c.assetId} != ${o.assetId}`);
      if (c.representationId !== o.representationId) {
        m.push(
          `components[${i}].representationId ${c.representationId} != ${o.representationId}`,
        );
      }
      if (c.weightBps !== o.weightBps)
        m.push(`components[${i}].weightBps ${c.weightBps} != ${o.weightBps}`);
    });
  }

  const sum = f.components.reduce((s, c) => s + c.weightBps, 0);
  if (sum !== BPS_TOTAL) m.push(`weightBps sum ${sum} != ${BPS_TOTAL}`);

  for (const a of meta.attributes) {
    if (MARKET_WORDS.test(a.trait_type)) {
      m.push(
        `attribute "${a.trait_type}" reads as market data — static metadata must not carry it`,
      );
    }
  }

  return { ok: m.length === 0, mismatches: m };
}

// -------------------------------------------------------------- dynamic layer ---

/** A single volatile datum — always with the source it came from and when. */
export interface MarketDataPoint {
  readonly value: number;
  readonly source: string; // e.g. "chainlink:0xFEED…", "nav-engine"
  readonly observedAt: number; // unix seconds
  readonly stale: boolean;
}

export interface ComponentMarketPoint {
  readonly representationId: RepresentationId;
  readonly price: MarketDataPoint | null;
}

/**
 * The dynamic layer served by `/api/nffc/[tokenId]/market`. Recomputed on read
 * from the oracle + indexed prices; the DB only caches it; it can always be
 * rebuilt and is never a source of truth. `unavailableReason` is set when it
 * cannot be produced yet.
 */
export interface NffcMarketSnapshot {
  readonly tokenId: string;
  readonly referenceNav: MarketDataPoint | null;
  readonly components: readonly ComponentMarketPoint[];
  readonly asOf: number; // unix seconds — when this snapshot was assembled
  readonly degraded: boolean; // any component price stale or missing
  readonly unavailableReason?: string;
}

/** A well-formed "no data yet" snapshot (engines not deployed, token unknown, …). */
export function emptyMarketSnapshot(
  tokenId: string,
  asOf: number,
  unavailableReason: string,
): NffcMarketSnapshot {
  return {
    tokenId,
    referenceNav: null,
    components: [],
    asOf,
    degraded: true,
    unavailableReason,
  };
}
