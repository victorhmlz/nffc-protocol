import { describe, expect, it } from "vitest";
import { isValidTokenId } from "@/lib/token-id";

describe("isValidTokenId", () => {
  it("accepts positive decimal ids", () => {
    expect(isValidTokenId("1")).toBe(true);
    expect(isValidTokenId("42")).toBe(true);
  });

  it("rejects zero, negatives, leading zeros, and non-numeric input", () => {
    expect(isValidTokenId("0")).toBe(false);
    expect(isValidTokenId("-1")).toBe(false);
    expect(isValidTokenId("01")).toBe(false);
    expect(isValidTokenId("abc")).toBe(false);
    expect(isValidTokenId("")).toBe(false);
  });
});
