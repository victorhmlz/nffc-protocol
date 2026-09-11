import { describe, expect, it } from "vitest";
import type { ActivityEntry } from "@domain/nffc-detail/detail";
import type { IndexedNffcSummary } from "@domain/marketplace/listings";
import { buildProfile } from "@domain/profile/profile";

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

describe("buildProfile — created / owned / listed", () => {
  it("filters created by creatorAddress and owned by ownerAddress, independently", () => {
    const minted = nffc({ tokenId: "1", creatorAddress: ALICE, ownerAddress: BOB }); // Alice minted, sold to Bob
    const held = nffc({ tokenId: "2", creatorAddress: BOB, ownerAddress: ALICE }); // Bob minted, Alice holds it
    const profile = buildProfile(ALICE, [minted, held], []);
    expect(profile.created.map((n) => n.tokenId)).toEqual(["1"]);
    expect(profile.owned.map((n) => n.tokenId)).toEqual(["2"]);
  });

  it("matches addresses case-insensitively", () => {
    const item = nffc({ tokenId: "1", creatorAddress: ALICE.toUpperCase() });
    const profile = buildProfile(ALICE, [item], []);
    expect(profile.created.map((n) => n.tokenId)).toEqual(["1"]);
  });

  it("includes in listed only an active listing where this wallet is the seller", () => {
    const activeBySelf = nffc({
      tokenId: "1",
      ownerAddress: ALICE,
      listing: { sellerAddress: ALICE, priceWei: "1000000000000000000", active: true },
    });
    const activeByOther = nffc({
      tokenId: "2",
      ownerAddress: ALICE,
      listing: { sellerAddress: BOB, priceWei: "1000000000000000000", active: true },
    });
    const inactive = nffc({
      tokenId: "3",
      ownerAddress: ALICE,
      listing: { sellerAddress: ALICE, priceWei: "1000000000000000000", active: false },
    });
    const unlisted = nffc({ tokenId: "4", ownerAddress: ALICE, listing: null });
    const profile = buildProfile(ALICE, [activeBySelf, activeByOther, inactive, unlisted], []);
    expect(profile.listed.map((n) => n.tokenId)).toEqual(["1"]);
  });

  it("sorts created/owned/listed newest-minted first", () => {
    const early = nffc({ tokenId: "1", mintedAt: "2026-01-01T00:00:00.000Z" });
    const late = nffc({ tokenId: "2", mintedAt: "2026-06-01T00:00:00.000Z" });
    const profile = buildProfile(ALICE, [early, late], []);
    expect(profile.created.map((n) => n.tokenId)).toEqual(["2", "1"]);
  });

  it("returns empty arrays for a wallet with no NFFCs", () => {
    const profile = buildProfile(BOB, [nffc({ tokenId: "1" })], []);
    expect(profile.created).toEqual([]);
    expect(profile.owned).toEqual([]);
    expect(profile.listed).toEqual([]);
  });
});

describe("buildProfile — collections", () => {
  it("groups created NFFCs by collection and counts them", () => {
    const a = nffc({ tokenId: "1", collectionId: "1", collectionName: "Blue Chips" });
    const b = nffc({ tokenId: "2", collectionId: "1", collectionName: "Blue Chips" });
    const c = nffc({ tokenId: "3", collectionId: "2", collectionName: "Momentum" });
    const profile = buildProfile(ALICE, [a, b, c], []);
    expect(profile.collections).toEqual([
      { collectionId: "1", collectionName: "Blue Chips", nffcCount: 2 },
      { collectionId: "2", collectionName: "Momentum", nffcCount: 1 },
    ]);
  });

  it("does not count NFFCs this wallet merely owns, only ones it created", () => {
    const owned = nffc({ tokenId: "1", creatorAddress: BOB, ownerAddress: ALICE, collectionId: "9" });
    const profile = buildProfile(ALICE, [owned], []);
    expect(profile.collections).toEqual([]);
  });

  it("sorts collections by nffcCount descending", () => {
    const solo = nffc({ tokenId: "1", collectionId: "solo", collectionName: "Solo" });
    const c1 = nffc({ tokenId: "2", collectionId: "big", collectionName: "Big" });
    const c2 = nffc({ tokenId: "3", collectionId: "big", collectionName: "Big" });
    const profile = buildProfile(ALICE, [solo, c1, c2], []);
    expect(profile.collections.map((c) => c.collectionId)).toEqual(["big", "solo"]);
  });
});

describe("buildProfile — activity", () => {
  it("passes the given activity through as-is, without re-filtering or re-sorting", () => {
    const activity: ActivityEntry[] = [
      {
        id: "1",
        kind: "MINT",
        tokenId: "1",
        actorAddress: ALICE,
        counterpartyAddress: null,
        amountWei: null,
        blockNumber: 1,
        txHash: "0xabc",
        occurredAt: "2026-01-01T00:00:00.000Z",
      },
    ];
    const profile = buildProfile(ALICE, [], activity);
    expect(profile.recentActivity).toBe(activity);
  });
});
