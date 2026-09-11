import { describe, expect, it } from "vitest";
import type { IndexedNffcSummary } from "@domain/marketplace/listings";
import { search } from "@domain/search/search";

const ALICE = "0x1111111111111111111111111111111111aaaa";
const BOB = "0x2222222222222222222222222222222222bbbb";

function nffc(overrides: Partial<IndexedNffcSummary> & { tokenId: string }): IndexedNffcSummary {
  return {
    collectionId: "1",
    collectionName: "Blue Chips",
    creatorAddress: ALICE,
    ownerAddress: ALICE,
    segment: "MIXED",
    staticRarity: 0.5,
    mintConditionRegime: "mid",
    componentCount: 1,
    components: [{ position: 0, assetId: "asset:nvda", assetSymbol: "NVDA", assetClass: "EQUITY", weightBps: 10_000 }],
    artURI: "data:image/svg+xml,x",
    mintedAt: "2026-01-01T00:00:00.000Z",
    listing: null,
    ...overrides,
  };
}

describe("search — empty query", () => {
  it("returns empty results for a blank or whitespace-only query", () => {
    const all = [nffc({ tokenId: "1" })];
    expect(search(all, "")).toEqual({ query: "", nffcs: [], assets: [], collections: [], wallets: [] });
    expect(search(all, "   ").nffcs).toEqual([]);
  });
});

describe("search — NFFCs (partial composition, TASK-28 acceptance)", () => {
  it("matches an NFFC containing an asset whose symbol matches the query", () => {
    const withNvda = nffc({ tokenId: "1", components: [{ position: 0, assetId: "a", assetSymbol: "NVDA", assetClass: "EQUITY", weightBps: 10_000 }] });
    const withBtc = nffc({ tokenId: "2", components: [{ position: 0, assetId: "b", assetSymbol: "BTC", assetClass: "CRYPTO", weightBps: 10_000 }] });
    const results = search([withNvda, withBtc], "NVDA");
    expect(results.nffcs.map((n) => n.tokenId)).toEqual(["1"]);
  });

  it("matches case-insensitively and by partial symbol", () => {
    const withNvda = nffc({ tokenId: "1", components: [{ position: 0, assetId: "a", assetSymbol: "NVDA", assetClass: "EQUITY", weightBps: 10_000 }] });
    expect(search([withNvda], "nvda").nffcs.map((n) => n.tokenId)).toEqual(["1"]);
    expect(search([withNvda], "vd").nffcs.map((n) => n.tokenId)).toEqual(["1"]);
  });

  it("matches by exact tokenId or by collection name", () => {
    const byId = nffc({ tokenId: "42" });
    const byCollection = nffc({ tokenId: "1", collectionName: "Momentum Basket" });
    expect(search([byId], "42").nffcs.map((n) => n.tokenId)).toEqual(["42"]);
    expect(search([byCollection], "momentum").nffcs.map((n) => n.tokenId)).toEqual(["1"]);
  });

  it("sorts matches newest-minted first", () => {
    const early = nffc({ tokenId: "1", mintedAt: "2026-01-01T00:00:00.000Z" });
    const late = nffc({ tokenId: "2", mintedAt: "2026-06-01T00:00:00.000Z" });
    expect(search([early, late], "Blue").nffcs.map((n) => n.tokenId)).toEqual(["2", "1"]);
  });
});

describe("search — assets", () => {
  it("groups matching assets and counts how many NFFCs contain each", () => {
    const a = nffc({ tokenId: "1", components: [{ position: 0, assetId: "asset:nvda", assetSymbol: "NVDA", assetClass: "EQUITY", weightBps: 10_000 }] });
    const b = nffc({ tokenId: "2", components: [{ position: 0, assetId: "asset:nvda", assetSymbol: "NVDA", assetClass: "EQUITY", weightBps: 5000 }, { position: 1, assetId: "asset:btc", assetSymbol: "BTC", assetClass: "CRYPTO", weightBps: 5000 }] });
    const results = search([a, b], "NVDA");
    expect(results.assets).toEqual([{ assetId: "asset:nvda", assetSymbol: "NVDA", assetClass: "EQUITY", nffcCount: 2 }]);
  });

  it("does not match an unrelated asset", () => {
    const a = nffc({ tokenId: "1", components: [{ position: 0, assetId: "asset:btc", assetSymbol: "BTC", assetClass: "CRYPTO", weightBps: 10_000 }] });
    expect(search([a], "NVDA").assets).toEqual([]);
  });
});

describe("search — collections", () => {
  it("groups matching collections and counts their NFFCs", () => {
    const a = nffc({ tokenId: "1", collectionId: "1", collectionName: "Blue Chips" });
    const b = nffc({ tokenId: "2", collectionId: "1", collectionName: "Blue Chips" });
    const c = nffc({ tokenId: "3", collectionId: "2", collectionName: "Momentum" });
    const results = search([a, b, c], "Blue");
    expect(results.collections).toEqual([{ collectionId: "1", collectionName: "Blue Chips", nffcCount: 2 }]);
  });
});

describe("search — wallets", () => {
  it("matches a wallet by a partial, case-insensitive address and counts created/owned", () => {
    const created = nffc({ tokenId: "1", creatorAddress: ALICE, ownerAddress: BOB });
    const owned = nffc({ tokenId: "2", creatorAddress: BOB, ownerAddress: ALICE });
    const results = search([created, owned], "1111111111111111111111111111111111aaaa");
    expect(results.wallets).toEqual([{ address: ALICE.toLowerCase(), createdCount: 1, ownedCount: 1 }]);
  });

  it("matches by a short address substring", () => {
    const item = nffc({ tokenId: "1", creatorAddress: ALICE, ownerAddress: ALICE });
    expect(search([item], "aaaa").wallets).toHaveLength(1);
  });

  it("sorts wallets by total (created + owned) descending", () => {
    const busy = nffc({ tokenId: "1", creatorAddress: ALICE, ownerAddress: ALICE });
    const quiet = nffc({ tokenId: "2", creatorAddress: BOB, ownerAddress: ALICE });
    // both addresses share the "1111...aaaa"/"2222...bbbb" pattern? use a common substring instead
    const results = search([busy, quiet], "0x");
    expect(results.wallets[0]?.address).toBe(ALICE.toLowerCase());
  });
});
