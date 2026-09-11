import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { usePortfolio } from "@/lib/portfolio/use-portfolio";
import type { Portfolio } from "@domain/portfolio/portfolio";

const ADDRESS = "0x1111111111111111111111111111111111aaaa" as const;

function fakePortfolio(): Portfolio {
  return {
    ownerAddress: ADDRESS,
    holdings: [],
    totalReferenceValue: 0,
    degraded: false,
    performance: [],
    exposureByAsset: [],
    exposureBySegment: [],
    exposureByCollection: [],
    asOf: 1_800_000_000 as never,
  };
}

describe("usePortfolio", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("fetches nothing and reports no loading when no address is given", () => {
    const { result } = renderHook(() => usePortfolio(undefined));
    expect(result.current.loading).toBe(false);
    expect(result.current.portfolio).toBeNull();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("fetches /api/portfolio/[address] once an address is given", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify(fakePortfolio()), { status: 200 }),
    );
    const { result } = renderHook(() => usePortfolio(ADDRESS));
    expect(result.current.loading).toBe(true);

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(fetch).toHaveBeenCalledWith(`/api/portfolio/${ADDRESS}`);
    expect(result.current.portfolio?.ownerAddress).toBe(ADDRESS);
    expect(result.current.error).toBeNull();
  });

  it("reports an error when the fetch fails", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response("nope", { status: 500 }));
    const { result } = renderHook(() => usePortfolio(ADDRESS));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toMatch(/500/);
    expect(result.current.portfolio).toBeNull();
  });
});
