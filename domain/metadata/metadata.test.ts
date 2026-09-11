import { describe, expect, it } from "vitest";
import type { AssetId, RepresentationId } from "@domain/registry/types";
import type { Hex32 } from "@domain/shared/branded";
import { BPS_TOTAL } from "@domain/nffc/composition";
import {
  MARKET_DATA_CACHE_CONTROL,
  STATIC_METADATA_CACHE_CONTROL,
  STATIC_METADATA_SCHEMA,
  buildStaticNffcMetadata,
  canonicalComponentTuples,
  emptyMarketSnapshot,
  serializeStaticMetadata,
  verifyStaticMetadataAgainstChain,
  type StaticComponentFact,
  type StaticNffcFacts,
  type StaticNffcMetadata,
} from "@domain/metadata/metadata";

const asAsset = (s: string) => s as AssetId;
const asRep = (s: string) => s as RepresentationId;
const asHex = (s: string) => s as Hex32;

function comp(
  overrides: Partial<StaticComponentFact> & { position: number },
): StaticComponentFact {
  return {
    assetId: asAsset(`0xasset${overrides.position}`),
    assetSymbol: `SYM${overrides.position}`,
    assetClass: "CRYPTO",
    providerId: "CRYPTO_NATIVE" as StaticComponentFact["providerId"],
    representationId: asRep(`0xrep${overrides.position}`),
    weightBps: 5000,
    ...overrides,
  };
}

function facts(overrides: Partial<StaticNffcFacts> = {}): StaticNffcFacts {
  const components = overrides.components ?? [
    comp({
      position: 0,
      assetSymbol: "NVDA",
      assetClass: "EQUITY",
      providerId: "ROBINHOOD" as never,
      weightBps: 6000,
    }),
    comp({ position: 1, assetSymbol: "BTC", weightBps: 4000 }),
  ];
  return {
    tokenId: "1",
    collectionId: "0",
    compositionHash: asHex("0xabc123"),
    segment: "MIXED",
    componentCount: components.length,
    components,
    mintedAtBlock: 100,
    staticRarity: null,
    mintConditionTrait: null,
    ...overrides,
  };
}

const build = (f: StaticNffcFacts): StaticNffcMetadata =>
  buildStaticNffcMetadata({
    facts: f,
    collectionName: "Test Collection",
    artURI: "ipfs://art",
    externalBaseUrl: "https://nffc.example/",
  });

function chainFrom(f: StaticNffcFacts) {
  return {
    tokenId: f.tokenId,
    compositionHash: f.compositionHash,
    segment: f.segment,
    components: f.components.map((c) => ({
      assetId: c.assetId,
      representationId: c.representationId,
      weightBps: c.weightBps,
    })),
  };
}

describe("buildStaticNffcMetadata", () => {
  it("produces ERC-721 standard fields + an nffc facts mirror", () => {
    const meta = build(facts());
    expect(meta.schema).toBe(STATIC_METADATA_SCHEMA);
    expect(meta.name).toBe("Test Collection #1");
    expect(meta.image).toBe("ipfs://art");
    expect(meta.external_url).toBe("https://nffc.example/nffc/1");
    expect(meta.nffc.componentCount).toBe(2);
    expect(meta.attributes).toContainEqual({
      trait_type: "Segment",
      value: "MIXED",
    });
    expect(meta.attributes).toContainEqual({
      trait_type: "Components",
      value: 2,
      display_type: "number",
    });
    expect(meta.attributes).toContainEqual({
      trait_type: "NVDA",
      value: 60,
      display_type: "boost_percentage",
    });
  });

  it("omits static rarity / mint-condition attributes until those are populated", () => {
    const meta = build(facts());
    expect(meta.attributes.some((a) => a.trait_type === "Static Rarity")).toBe(
      false,
    );
    expect(
      meta.attributes.some((a) => a.trait_type.startsWith("Mint · ")),
    ).toBe(false);
  });

  it("includes static rarity and mint-condition traits when present", () => {
    const meta = build(
      facts({
        staticRarity: 0.42,
        mintConditionTrait: { drawdownPct: 12, regime: "bull" },
      }),
    );
    expect(meta.attributes).toContainEqual({
      trait_type: "Static Rarity",
      value: 0.42,
      display_type: "number",
    });
    expect(meta.attributes).toContainEqual({
      trait_type: "Mint · drawdownPct",
      value: 12,
    });
    expect(meta.attributes).toContainEqual({
      trait_type: "Mint · regime",
      value: "bull",
    });
  });

  it("is deterministic — same facts serialize byte-identically, key order irrelevant", () => {
    const a = serializeStaticMetadata(build(facts()));
    const b = serializeStaticMetadata(build(facts()));
    expect(a).toBe(b);
    // canonical form is key-sorted: "attributes" precedes "name" precedes "schema"
    expect(a.indexOf('"attributes"')).toBeLessThan(a.indexOf('"name"'));
    expect(a.indexOf('"name"')).toBeLessThan(a.indexOf('"schema"'));
  });
});

describe("canonicalComponentTuples", () => {
  it("returns [assetId, representationId, weightBps] in on-chain order", () => {
    const f = facts();
    expect(canonicalComponentTuples(f)).toEqual([
      [f.components[0]!.assetId, f.components[0]!.representationId, 6000],
      [f.components[1]!.assetId, f.components[1]!.representationId, 4000],
    ]);
  });
});

describe("verifyStaticMetadataAgainstChain", () => {
  it("passes when the document matches chain state", () => {
    const f = facts();
    const res = verifyStaticMetadataAgainstChain(build(f), chainFrom(f));
    expect(res).toEqual({ ok: true, mismatches: [] });
  });

  it("flags a composition-hash mismatch (a tampered pinned file)", () => {
    const f = facts();
    const chain = { ...chainFrom(f), compositionHash: asHex("0xdifferent") };
    const res = verifyStaticMetadataAgainstChain(build(f), chain);
    expect(res.ok).toBe(false);
    expect(res.mismatches.join(" ")).toMatch(/compositionHash/);
  });

  it("flags a segment mismatch", () => {
    const f = facts();
    const res = verifyStaticMetadataAgainstChain(build(f), {
      ...chainFrom(f),
      segment: "CRYPTO_ONLY",
    });
    expect(res.ok).toBe(false);
    expect(res.mismatches.join(" ")).toMatch(/segment/);
  });

  it("flags a per-component weight mismatch", () => {
    const f = facts();
    const chain = chainFrom(f);
    const res = verifyStaticMetadataAgainstChain(build(f), {
      ...chain,
      components: [
        { ...chain.components[0]!, weightBps: 5000 },
        chain.components[1]!,
      ],
    });
    expect(res.ok).toBe(false);
    expect(res.mismatches.join(" ")).toMatch(/components\[0\]\.weightBps/);
  });

  it("flags a component-count / length mismatch", () => {
    const f = facts();
    const chain = chainFrom(f);
    const res = verifyStaticMetadataAgainstChain(build(f), {
      ...chain,
      components: [chain.components[0]!],
    });
    expect(res.ok).toBe(false);
    expect(res.mismatches.join(" ")).toMatch(/components length/);
  });

  it("flags weights that do not sum to 10,000", () => {
    const bad = facts({
      components: [
        comp({ position: 0, weightBps: 6000 }),
        comp({ position: 1, weightBps: 3999 }),
      ],
    });
    const res = verifyStaticMetadataAgainstChain(build(bad), chainFrom(bad));
    expect(res.ok).toBe(false);
    expect(res.mismatches.join(" ")).toMatch(
      new RegExp(`weightBps sum .*!= ${BPS_TOTAL}`),
    );
  });

  it("rejects a document that carries a market-data attribute", () => {
    const meta = build(facts());
    const tampered: StaticNffcMetadata = {
      ...meta,
      attributes: [
        ...meta.attributes,
        { trait_type: "Reference NAV (USD)", value: 1234 },
      ],
    };
    const res = verifyStaticMetadataAgainstChain(tampered, chainFrom(facts()));
    expect(res.ok).toBe(false);
    expect(res.mismatches.join(" ")).toMatch(/market data/);
  });
});

describe("dynamic layer", () => {
  it("emptyMarketSnapshot is well-formed and degraded with a reason", () => {
    const snap = emptyMarketSnapshot(
      "7",
      1_700_000_000,
      "price engine not deployed",
    );
    expect(snap).toEqual({
      tokenId: "7",
      referenceNav: null,
      components: [],
      performance: [],
      asOf: 1_700_000_000,
      degraded: true,
      unavailableReason: "price engine not deployed",
    });
  });

  it("cache-control constants encode the static/dynamic split", () => {
    expect(STATIC_METADATA_CACHE_CONTROL).toContain("immutable");
    expect(MARKET_DATA_CACHE_CONTROL).toBe("no-store");
  });
});
