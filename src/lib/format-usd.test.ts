import { describe, expect, it } from "vitest";
import { formatUsd } from "@/lib/format-usd";

describe("formatUsd", () => {
  it("formats with a dollar sign and two decimals", () => {
    expect(formatUsd(1234.5)).toBe("$1,234.50");
  });

  it("formats zero", () => {
    expect(formatUsd(0)).toBe("$0.00");
  });

  it("rounds to two decimals", () => {
    expect(formatUsd(0.005)).toBe("$0.01");
  });
});
