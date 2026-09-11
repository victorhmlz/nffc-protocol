import { describe, expect, it } from "vitest";
import { ACTIVITY_DEFAULT_PAGE_SIZE } from "@domain/activity/activity";
import { parseActivitySearchParams } from "@/lib/activity/parse-query";

describe("parseActivitySearchParams", () => {
  it("defaults to no filter, page 1", () => {
    expect(parseActivitySearchParams({})).toEqual({
      filter: { tokenId: undefined, wallet: undefined, kind: undefined },
      page: 1,
      pageSize: ACTIVITY_DEFAULT_PAGE_SIZE,
    });
  });

  it("parses a tokenId", () => {
    expect(parseActivitySearchParams({ tokenId: "7" }).filter.tokenId).toBe("7");
  });

  it("parses a wallet", () => {
    expect(parseActivitySearchParams({ wallet: "0xabc" }).filter.wallet).toBe("0xabc");
  });

  it("parses one or more kinds", () => {
    expect(parseActivitySearchParams({ kind: ["MINT", "SALE"] }).filter.kind).toEqual(["MINT", "SALE"]);
  });

  it("ignores an invalid kind rather than throwing", () => {
    expect(parseActivitySearchParams({ kind: "NOT_A_KIND" }).filter.kind).toBeUndefined();
  });

  it("drops the recognized kinds among a mixed valid/invalid list", () => {
    expect(parseActivitySearchParams({ kind: ["MINT", "NOT_A_KIND"] }).filter.kind).toEqual(["MINT"]);
  });

  it("parses a page number", () => {
    expect(parseActivitySearchParams({ page: "3" }).page).toBe(3);
  });

  it("defaults an invalid page to 1", () => {
    expect(parseActivitySearchParams({ page: "not-a-number" }).page).toBe(1);
    expect(parseActivitySearchParams({ page: "-1" }).page).toBe(1);
  });

  it("takes the first value when a single-value param is repeated", () => {
    expect(parseActivitySearchParams({ tokenId: ["7", "8"] }).filter.tokenId).toBe("7");
  });
});
