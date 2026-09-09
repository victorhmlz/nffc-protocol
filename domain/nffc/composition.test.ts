import { describe, expect, it } from "vitest";
import {
  BPS_TOTAL,
  MAX_COMPONENTS,
  MIN_COMPONENTS,
} from "@domain/nffc/composition";

describe("NFFC composition invariant constants", () => {
  it("fixes 1..20 components summing to 10,000 bps", () => {
    expect(MIN_COMPONENTS).toBe(1);
    expect(MAX_COMPONENTS).toBe(20);
    expect(BPS_TOTAL).toBe(10_000);
  });
});
