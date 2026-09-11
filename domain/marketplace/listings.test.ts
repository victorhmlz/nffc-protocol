import { describe, expect, it } from "vitest";
import { DEFAULT_PAGE_SIZE, queryListings, type IndexedNffcSummary } from "@domain/marketplace/listings";

function item(overrides: Partial<IndexedNffcSummary> & { tokenId: string }): IndexedNffcSummary {
  return {
    collectionId: "1",
    collectionName: "Blue Chips",
    creatorAddress: "0xcreator",
    ownerAddress: "0xowner",
    segment: "MIXED",
    staticRarity: 0.5,
    mintConditionRegime: "mid",
    componentCount: 2,
    components: [],
    artURI: "data:image/svg+xml,x",
    mintedAt: "2026-01-01T00:00:00.000Z",
    listing: null,
    ...overrides,
  };
}

const A = item({
  tokenId: "1",
  segment: "CRYPTO_ONLY",
  staticRarity: 0.9,
  mintConditionRegime: "at-highs",
  mintedAt: "2026-01-01T00:00:00.000Z",
  listing: { sellerAddress: "0xa", priceWei: "3000000000000000000", active: true }, // 3 ETH
});
const B = item({
  tokenId: "2",
  segment: "STOCK_ONLY",
  staticRarity: 0.2,
  mintConditionRegime: "deep-drawdown",
  mintedAt: "2026-01-02T00:00:00.000Z",
  listing: { sellerAddress: "0xb", priceWei: "1000000000000000000", active: true }, // 1 ETH
});
const C = item({
  tokenId: "3",
  segment: "MIXED",
  staticRarity: 0.5,
  mintConditionRegime: "near-highs",
  mintedAt: "2026-01-03T00:00:00.000Z",
  listing: null, // never listed
});
const ALL = [A, B, C];

function baseQuery(overrides: Partial<Parameters<typeof queryListings>[1]> = {}) {
  return { filter: {}, sort: "newest" as const, page: 1, pageSize: DEFAULT_PAGE_SIZE, ...overrides };
}

describe("queryListings — filters operate on the indexed shape only (acceptance)", () => {
  it("returns everything with an empty filter", () => {
    const result = queryListings(ALL, baseQuery());
    expect(result.total).toBe(3);
    expect(result.items.map((i) => i.tokenId).sort()).toEqual(["1", "2", "3"]);
  });

  it("filters by segment", () => {
    const result = queryListings(ALL, baseQuery({ filter: { segment: "CRYPTO_ONLY" } }));
    expect(result.items.map((i) => i.tokenId)).toEqual(["1"]);
  });

  it("filters by a minimum static rarity", () => {
    const result = queryListings(ALL, baseQuery({ filter: { minStaticRarity: 0.5 } }));
    expect(result.items.map((i) => i.tokenId).sort()).toEqual(["1", "3"]);
  });

  it("filters by mint-condition regime, multiple values", () => {
    const result = queryListings(
      ALL,
      baseQuery({ filter: { mintRegime: ["at-highs", "near-highs"] } }),
    );
    expect(result.items.map((i) => i.tokenId).sort()).toEqual(["1", "3"]);
  });

  it("filters to listed-only", () => {
    const result = queryListings(ALL, baseQuery({ filter: { listedOnly: true } }));
    expect(result.items.map((i) => i.tokenId).sort()).toEqual(["1", "2"]);
  });

  it("combines multiple filters (AND semantics)", () => {
    const result = queryListings(
      ALL,
      baseQuery({ filter: { segment: "MIXED", listedOnly: true } }),
    );
    expect(result.items).toEqual([]); // C is MIXED but not listed
  });
});

describe("queryListings — sort", () => {
  it("newest first by default", () => {
    const result = queryListings(ALL, baseQuery());
    expect(result.items.map((i) => i.tokenId)).toEqual(["3", "2", "1"]);
  });

  it("rarity_desc", () => {
    const result = queryListings(ALL, baseQuery({ sort: "rarity_desc" }));
    expect(result.items.map((i) => i.tokenId)).toEqual(["1", "3", "2"]);
  });

  it("price_asc — unlisted items sort after every listed item", () => {
    const result = queryListings(ALL, baseQuery({ sort: "price_asc" }));
    expect(result.items.map((i) => i.tokenId)).toEqual(["2", "1", "3"]);
  });

  it("price_desc — unlisted items still sort last, not first", () => {
    const result = queryListings(ALL, baseQuery({ sort: "price_desc" }));
    expect(result.items.map((i) => i.tokenId)).toEqual(["1", "2", "3"]);
  });
});

describe("queryListings — pagination", () => {
  it("paginates and reports the pre-pagination total", () => {
    const page1 = queryListings(ALL, baseQuery({ pageSize: 2, page: 1 }));
    const page2 = queryListings(ALL, baseQuery({ pageSize: 2, page: 2 }));
    expect(page1.items).toHaveLength(2);
    expect(page2.items).toHaveLength(1);
    expect(page1.total).toBe(3);
    expect(page2.total).toBe(3);
  });

  it("an out-of-range page returns an empty page, not an error", () => {
    const result = queryListings(ALL, baseQuery({ page: 99 }));
    expect(result.items).toEqual([]);
    expect(result.total).toBe(3);
  });

  it("clamps a non-positive or absurd page/pageSize rather than trusting it verbatim", () => {
    const result = queryListings(ALL, baseQuery({ page: 0, pageSize: 0 }));
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(DEFAULT_PAGE_SIZE);
  });
});
