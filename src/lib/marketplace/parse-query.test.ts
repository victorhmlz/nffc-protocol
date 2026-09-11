import { describe, expect, it } from "vitest";
import { DEFAULT_PAGE_SIZE } from "@domain/marketplace/listings";
import { parseMarketplaceSearchParams } from "@/lib/marketplace/parse-query";

describe("parseMarketplaceSearchParams", () => {
  it("defaults to no filter, newest, page 1", () => {
    const q = parseMarketplaceSearchParams({});
    expect(q).toEqual({
      filter: { segment: undefined, minStaticRarity: undefined, mintRegime: undefined, listedOnly: undefined },
      sort: "newest",
      page: 1,
      pageSize: DEFAULT_PAGE_SIZE,
    });
  });

  it("parses a segment", () => {
    expect(parseMarketplaceSearchParams({ segment: "MIXED" }).filter.segment).toBe("MIXED");
  });

  it("ignores an invalid segment rather than throwing", () => {
    expect(parseMarketplaceSearchParams({ segment: "NOT_A_SEGMENT" }).filter.segment).toBeUndefined();
  });

  it("parses and clamps minRarity into [0, 1]", () => {
    expect(parseMarketplaceSearchParams({ minRarity: "0.5" }).filter.minStaticRarity).toBe(0.5);
    expect(parseMarketplaceSearchParams({ minRarity: "5" }).filter.minStaticRarity).toBe(1);
    expect(parseMarketplaceSearchParams({ minRarity: "-1" }).filter.minStaticRarity).toBe(0);
  });

  it("ignores a non-numeric minRarity", () => {
    expect(parseMarketplaceSearchParams({ minRarity: "abc" }).filter.minStaticRarity).toBeUndefined();
  });

  it("parses multiple regime values", () => {
    expect(parseMarketplaceSearchParams({ regime: ["at-highs", "mid"] }).filter.mintRegime).toEqual([
      "at-highs",
      "mid",
    ]);
  });

  it("parses a single regime value (not an array)", () => {
    expect(parseMarketplaceSearchParams({ regime: "near-highs" }).filter.mintRegime).toEqual(["near-highs"]);
  });

  it("drops unrecognized regime values, keeping the valid ones", () => {
    expect(parseMarketplaceSearchParams({ regime: ["mid", "bogus"] }).filter.mintRegime).toEqual(["mid"]);
  });

  it("parses listed=1 as listedOnly, anything else as undefined", () => {
    expect(parseMarketplaceSearchParams({ listed: "1" }).filter.listedOnly).toBe(true);
    expect(parseMarketplaceSearchParams({ listed: "0" }).filter.listedOnly).toBeUndefined();
    expect(parseMarketplaceSearchParams({}).filter.listedOnly).toBeUndefined();
  });

  it("parses a valid sort, defaults to newest for anything else", () => {
    expect(parseMarketplaceSearchParams({ sort: "price_asc" }).sort).toBe("price_asc");
    expect(parseMarketplaceSearchParams({ sort: "bogus" }).sort).toBe("newest");
  });

  it("parses page, defaulting to 1 for anything invalid", () => {
    expect(parseMarketplaceSearchParams({ page: "3" }).page).toBe(3);
    expect(parseMarketplaceSearchParams({ page: "0" }).page).toBe(1);
    expect(parseMarketplaceSearchParams({ page: "-2" }).page).toBe(1);
    expect(parseMarketplaceSearchParams({ page: "abc" }).page).toBe(1);
  });
});
