import { describe, expect, it } from "vitest";
import {
  EmptyCompositionError,
  SEGMENT_META,
  deriveSegment,
  deriveSegmentFromClasses,
  isGeoRestricted,
} from "@domain/nffc/segment";

describe("deriveSegment", () => {
  it("all-crypto → CRYPTO_ONLY", () => {
    expect(deriveSegment([true])).toBe("CRYPTO_ONLY");
    expect(deriveSegment([true, true, true])).toBe("CRYPTO_ONLY");
  });

  it("all-stock → STOCK_ONLY", () => {
    expect(deriveSegment([false])).toBe("STOCK_ONLY");
    expect(deriveSegment([false, false])).toBe("STOCK_ONLY");
  });

  it("any mix → MIXED", () => {
    expect(deriveSegment([true, false])).toBe("MIXED");
    expect(deriveSegment([false, true, false, false])).toBe("MIXED");
  });

  it("rejects an empty composition", () => {
    expect(() => deriveSegment([])).toThrow(EmptyCompositionError);
  });
});

describe("deriveSegmentFromClasses", () => {
  it("maps CRYPTO → crypto, everything else → stock", () => {
    expect(deriveSegmentFromClasses(["CRYPTO", "CRYPTO"])).toBe("CRYPTO_ONLY");
    expect(deriveSegmentFromClasses(["EQUITY", "EQUITY"])).toBe("STOCK_ONLY");
    expect(deriveSegmentFromClasses(["EQUITY", "CRYPTO"])).toBe("MIXED");
  });
});

describe("SEGMENT_META", () => {
  it("marks stock-only and mixed as geo-restricted, crypto-only not", () => {
    expect(isGeoRestricted("CRYPTO_ONLY")).toBe(false);
    expect(isGeoRestricted("STOCK_ONLY")).toBe(true);
    expect(isGeoRestricted("MIXED")).toBe(true);
  });

  it("has a label and a note for every segment", () => {
    for (const seg of ["CRYPTO_ONLY", "STOCK_ONLY", "MIXED"] as const) {
      expect(SEGMENT_META[seg].label.length).toBeGreaterThan(0);
      expect(SEGMENT_META[seg].note.length).toBeGreaterThan(0);
    }
  });
});
