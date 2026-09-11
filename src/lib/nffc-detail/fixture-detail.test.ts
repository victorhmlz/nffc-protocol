import { describe, expect, it } from "vitest";
import { FIXTURE_LISTINGS } from "@/lib/marketplace/fixture-listings";
import { FIXTURE_DETAILS } from "@/lib/nffc-detail/fixture-detail";

describe("FIXTURE_DETAILS — derived from FIXTURE_LISTINGS, so /market and /nffc/[tokenId] agree", () => {
  it("has one entry per FIXTURE_LISTINGS token", () => {
    expect(FIXTURE_DETAILS.size).toBe(FIXTURE_LISTINGS.length);
    for (const item of FIXTURE_LISTINGS) {
      expect(FIXTURE_DETAILS.has(item.tokenId)).toBe(true);
    }
  });

  it("carries the same segment, rarity, and listing as the matching FIXTURE_LISTINGS entry", () => {
    for (const item of FIXTURE_LISTINGS) {
      const detail = FIXTURE_DETAILS.get(item.tokenId)!;
      expect(detail.metadata.nffc.segment).toBe(item.segment);
      expect(detail.metadata.nffc.staticRarity).toBe(item.staticRarity);
      expect(detail.listing).toEqual(item.listing);
    }
  });

  it("derives a mint-condition trait whose Regime matches the FIXTURE_LISTINGS summary", () => {
    for (const item of FIXTURE_LISTINGS) {
      const detail = FIXTURE_DETAILS.get(item.tokenId)!;
      expect(detail.metadata.nffc.mintConditionTrait?.Regime).toBe(item.mintConditionRegime);
    }
  });

  it("every activity entry traces to a block number and a transaction hash", () => {
    for (const detail of FIXTURE_DETAILS.values()) {
      expect(detail.activity.length).toBeGreaterThan(0);
      for (const entry of detail.activity) {
        expect(entry.blockNumber).toBeGreaterThan(0);
        expect(entry.txHash).toMatch(/^0x[0-9a-f]+$/);
      }
    }
  });

  it("always starts with a MINT entry", () => {
    for (const detail of FIXTURE_DETAILS.values()) {
      expect(detail.activity[0]!.kind).toBe("MINT");
    }
  });

  it("adds a TRANSFER entry only when the creator and owner differ", () => {
    for (const item of FIXTURE_LISTINGS) {
      const detail = FIXTURE_DETAILS.get(item.tokenId)!;
      const hasTransfer = detail.activity.some((e) => e.kind === "TRANSFER");
      expect(hasTransfer).toBe(item.creatorAddress !== item.ownerAddress);
    }
  });

  it("token 1 carries one active offer; the others carry none", () => {
    expect(FIXTURE_DETAILS.get("1")!.offers).toHaveLength(1);
    expect(FIXTURE_DETAILS.get("1")!.offers[0]!.active).toBe(true);
    for (const [tokenId, detail] of FIXTURE_DETAILS) {
      if (tokenId !== "1") expect(detail.offers).toHaveLength(0);
    }
  });
});
