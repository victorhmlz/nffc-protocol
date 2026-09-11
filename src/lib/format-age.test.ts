import { describe, expect, it } from "vitest";
import { formatAge } from "@/lib/format-age";

const NOW = 1_700_000_000_000; // ms
const nowS = NOW / 1000;

describe("formatAge", () => {
  it("just now, for under a minute", () => {
    expect(formatAge(nowS - 5, NOW)).toBe("just now");
    expect(formatAge(nowS, NOW)).toBe("just now");
  });

  it("minutes", () => {
    expect(formatAge(nowS - 90, NOW)).toBe("1m ago");
    expect(formatAge(nowS - 59 * 60, NOW)).toBe("59m ago");
  });

  it("hours", () => {
    expect(formatAge(nowS - 60 * 60, NOW)).toBe("1h ago");
    expect(formatAge(nowS - 23 * 3600, NOW)).toBe("23h ago");
  });

  it("days", () => {
    expect(formatAge(nowS - 24 * 3600, NOW)).toBe("1d ago");
    expect(formatAge(nowS - 10 * 86400, NOW)).toBe("10d ago");
  });

  it("clamps a future timestamp to non-negative", () => {
    expect(formatAge(nowS + 3600, NOW)).toBe("just now");
  });
});
