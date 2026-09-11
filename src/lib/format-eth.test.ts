import { describe, expect, it } from "vitest";
import { formatEth } from "@/lib/format-eth";

describe("formatEth", () => {
  it("formats a whole ETH amount with no decimal", () => {
    expect(formatEth("2000000000000000000")).toBe("2 ETH");
  });

  it("formats a fractional amount, trimming trailing zeros", () => {
    expect(formatEth("2500000000000000000")).toBe("2.5 ETH");
  });

  it("formats zero", () => {
    expect(formatEth("0")).toBe("0 ETH");
  });

  it("keeps at most 3 fractional digits", () => {
    expect(formatEth("1234567890000000000")).toBe("1.234 ETH");
  });
});
