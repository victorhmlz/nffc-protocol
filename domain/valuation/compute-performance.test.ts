import { describe, expect, it } from "vitest";
import type { TokenId } from "@domain/nffc/composition";
import type { UnixSeconds } from "@domain/shared/branded";
import type { NavPoint } from "@domain/valuation/types";
import { computePerformanceWindows } from "@domain/valuation/compute-performance";

const TOKEN_ID = 7n as TokenId;
const DAY = 86_400;
const NOW = 1_800_000_000 as UnixSeconds;

function point(at: number, value: number): NavPoint {
  return { tokenId: TOKEN_ID, value, at: at as UnixSeconds, degraded: false };
}

describe("computePerformanceWindows — window selection", () => {
  it("returns an empty list for no history at all", () => {
    expect(computePerformanceWindows([], NOW, NOW)).toEqual([]);
  });

  it("includes only SINCE_MINT when history doesn't reach back a full day", () => {
    const history = [point(NOW - 3600, 100), point(NOW, 110)];
    const points = computePerformanceWindows(history, NOW, (NOW - 3600) as UnixSeconds);
    expect(points.map((p) => p.window)).toEqual(["SINCE_MINT"]);
  });

  it("includes 1D once history reaches back at least a day, but not 7D/30D yet", () => {
    const history = [point(NOW - 2 * DAY, 100), point(NOW, 110)];
    const points = computePerformanceWindows(history, NOW, (NOW - 2 * DAY) as UnixSeconds);
    expect(points.map((p) => p.window)).toEqual(["1D", "SINCE_MINT"]);
  });

  it("includes all four windows once history spans more than 30 days", () => {
    const history = [point(NOW - 40 * DAY, 100), point(NOW - 10 * DAY, 105), point(NOW, 120)];
    const points = computePerformanceWindows(history, NOW, (NOW - 40 * DAY) as UnixSeconds);
    expect(points.map((p) => p.window)).toEqual(["1D", "7D", "30D", "SINCE_MINT"]);
  });

  it("sorts unsorted input before computing", () => {
    const history = [point(NOW, 120), point(NOW - 40 * DAY, 100)];
    const points = computePerformanceWindows(history, NOW, (NOW - 40 * DAY) as UnixSeconds);
    const sinceMint = points.find((p) => p.window === "SINCE_MINT")!;
    expect(sinceMint.from.value).toBe(100);
    expect(sinceMint.to.value).toBe(120);
  });
});

describe("computePerformanceWindows — change math", () => {
  it("computes a positive fractional change", () => {
    const history = [point(NOW - 2 * DAY, 100), point(NOW, 110)];
    const points = computePerformanceWindows(history, NOW, (NOW - 2 * DAY) as UnixSeconds);
    const oneDay = points.find((p) => p.window === "1D")!;
    expect(oneDay.change).toBeCloseTo(0.1);
  });

  it("computes a negative fractional change", () => {
    const history = [point(NOW - 2 * DAY, 200), point(NOW, 150)];
    const points = computePerformanceWindows(history, NOW, (NOW - 2 * DAY) as UnixSeconds);
    const oneDay = points.find((p) => p.window === "1D")!;
    expect(oneDay.change).toBeCloseTo(-0.25);
  });

  it("reports a flat 0 change rather than NaN/Infinity from a zero base", () => {
    const history = [point(NOW - 2 * DAY, 0), point(NOW, 50)];
    const points = computePerformanceWindows(history, NOW, (NOW - 2 * DAY) as UnixSeconds);
    const oneDay = points.find((p) => p.window === "1D")!;
    expect(oneDay.change).toBe(0);
  });
});

describe("computePerformanceWindows — SINCE_MINT anchoring", () => {
  it("anchors on the point at or before mintedAt when one exists", () => {
    const mintedAt = (NOW - 50 * DAY) as UnixSeconds;
    const history = [point(NOW - 50 * DAY, 90), point(NOW - 40 * DAY, 100), point(NOW, 120)];
    const points = computePerformanceWindows(history, NOW, mintedAt);
    const sinceMint = points.find((p) => p.window === "SINCE_MINT")!;
    expect(sinceMint.from.value).toBe(90);
  });

  it("falls back to the earliest recorded point when history starts after mintedAt", () => {
    // The token was minted before this NAV engine's history began — an honest
    // "since we started tracking" proxy rather than fabricating an earlier point.
    const mintedAt = (NOW - 100 * DAY) as UnixSeconds;
    const history = [point(NOW - 40 * DAY, 100), point(NOW, 120)];
    const points = computePerformanceWindows(history, NOW, mintedAt);
    const sinceMint = points.find((p) => p.window === "SINCE_MINT")!;
    expect(sinceMint.from.value).toBe(100);
  });
});
