import { describe, expect, it } from "vitest";
import type { ActivityEntry } from "@domain/nffc-detail/detail";
import type { IndexedNffcSummary } from "@domain/marketplace/listings";
import { buildProtocolReport, listAllCollections } from "@domain/admin/admin";

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
    components: [],
    artURI: "data:image/svg+xml,x",
    mintedAt: "2026-01-01T00:00:00.000Z",
    listing: null,
    ...overrides,
  };
}

function entry(overrides: Partial<ActivityEntry> & { id: string }): ActivityEntry {
  return {
    kind: "TRANSFER",
    tokenId: "1",
    actorAddress: ALICE,
    counterpartyAddress: null,
    amountWei: null,
    blockNumber: 100,
    txHash: "0xtx",
    occurredAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("listAllCollections", () => {
  it("groups every collection across all creators, not filtered to one wallet", () => {
    const a = nffc({ tokenId: "1", collectionId: "1", collectionName: "Blue Chips", creatorAddress: ALICE });
    const b = nffc({ tokenId: "2", collectionId: "2", collectionName: "Momentum", creatorAddress: BOB });
    const result = listAllCollections([a, b]);
    expect(result).toHaveLength(2);
    expect(result.map((c) => c.creatorAddress).sort()).toEqual([ALICE, BOB].sort());
  });

  it("counts every NFFC in a collection and sorts by count descending", () => {
    const big1 = nffc({ tokenId: "1", collectionId: "big", collectionName: "Big" });
    const big2 = nffc({ tokenId: "2", collectionId: "big", collectionName: "Big" });
    const solo = nffc({ tokenId: "3", collectionId: "solo", collectionName: "Solo" });
    const result = listAllCollections([solo, big1, big2]);
    expect(result[0]).toMatchObject({ collectionId: "big", nffcCount: 2 });
    expect(result[1]).toMatchObject({ collectionId: "solo", nffcCount: 1 });
  });

  it("returns an empty array for no NFFCs", () => {
    expect(listAllCollections([])).toEqual([]);
  });
});

describe("buildProtocolReport", () => {
  it("counts totals, segments, and active listings", () => {
    const a = nffc({ tokenId: "1", segment: "CRYPTO_ONLY", listing: { sellerAddress: ALICE, priceWei: "1", active: true } });
    const b = nffc({ tokenId: "2", segment: "CRYPTO_ONLY" });
    const c = nffc({ tokenId: "3", collectionId: "2", collectionName: "Other", segment: "STOCK_ONLY" });
    const report = buildProtocolReport([a, b, c], []);
    expect(report.totalNffcs).toBe(3);
    expect(report.totalCollections).toBe(2);
    expect(report.segmentCounts).toEqual({ CRYPTO_ONLY: 2, STOCK_ONLY: 1 });
    expect(report.activeListingCount).toBe(1);
  });

  it("does not fabricate a zero entry for a segment with no NFFCs", () => {
    const a = nffc({ tokenId: "1", segment: "CRYPTO_ONLY" });
    const report = buildProtocolReport([a], []);
    expect(report.segmentCounts).toEqual({ CRYPTO_ONLY: 1 });
    expect(report.segmentCounts.STOCK_ONLY).toBeUndefined();
  });

  it("sums SALE activity amounts into totalSaleVolumeWei, ignoring other kinds", () => {
    const activity: ActivityEntry[] = [
      entry({ id: "1", kind: "SALE", amountWei: "1000000000000000000" }),
      entry({ id: "2", kind: "SALE", amountWei: "500000000000000000" }),
      entry({ id: "3", kind: "MINT", amountWei: null }),
      entry({ id: "4", kind: "OFFER_CREATED", amountWei: "999999999999999999" }),
    ];
    const report = buildProtocolReport([], activity);
    expect(report.totalSaleVolumeWei).toBe("1500000000000000000");
    expect(report.saleCount).toBe(2);
  });

  it("reports zero volume, not an error, when there is no sale activity", () => {
    const report = buildProtocolReport([], []);
    expect(report.totalSaleVolumeWei).toBe("0");
    expect(report.saleCount).toBe(0);
  });
});
