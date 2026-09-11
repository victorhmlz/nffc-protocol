import { describe, expect, it } from "vitest";
import { parseSearchQuery } from "@/lib/search/parse-query";

describe("parseSearchQuery", () => {
  it("defaults to an empty string when q is absent", () => {
    expect(parseSearchQuery({})).toBe("");
  });

  it("returns the q param", () => {
    expect(parseSearchQuery({ q: "NVDA" })).toBe("NVDA");
  });

  it("takes the first value when q is repeated", () => {
    expect(parseSearchQuery({ q: ["NVDA", "BTC"] })).toBe("NVDA");
  });
});
