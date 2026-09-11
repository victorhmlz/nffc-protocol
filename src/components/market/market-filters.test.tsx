import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const push = vi.fn();
let currentSearch = "";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
  useSearchParams: () => new URLSearchParams(currentSearch),
}));

import { MarketFilters } from "@/components/market/market-filters";

/** Order-independent comparison of a pushed "/market?..." URL's query params. */
function paramsOf(url: string): Record<string, string[]> {
  const query = url.split("?")[1] ?? "";
  const out: Record<string, string[]> = {};
  for (const [key, value] of new URLSearchParams(query)) {
    (out[key] ??= []).push(value);
  }
  return out;
}

function lastPushedParams(): Record<string, string[]> {
  const [url] = push.mock.calls.at(-1) as [string];
  return paramsOf(url);
}

beforeEach(() => {
  push.mockClear();
  currentSearch = "";
});

describe("MarketFilters — renders every control", () => {
  it("renders segment, rarity, mint-condition, listed-only, and sort controls", () => {
    render(<MarketFilters />);
    expect(screen.getByLabelText("Segment")).toBeInTheDocument();
    expect(screen.getByLabelText("Static rarity")).toBeInTheDocument();
    expect(screen.getByLabelText("Sort")).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Listed only" })).toBeInTheDocument();
    for (const label of ["At highs", "Near highs", "Mid-drawdown", "Deep drawdown"]) {
      expect(screen.getByRole("checkbox", { name: label })).toBeInTheDocument();
    }
  });
});

describe("MarketFilters — URL query-param string-building", () => {
  it("sets a filter param and resets page, preserving other params", () => {
    currentSearch = "sort=price_asc&page=3";
    render(<MarketFilters />);
    fireEvent.change(screen.getByLabelText("Segment"), { target: { value: "MIXED" } });

    expect(lastPushedParams()).toEqual({ sort: ["price_asc"], segment: ["MIXED"] });
  });

  it("removes a param entirely when reset to the empty option", () => {
    currentSearch = "segment=MIXED&sort=newest";
    render(<MarketFilters />);
    fireEvent.change(screen.getByLabelText("Segment"), { target: { value: "" } });

    expect(lastPushedParams()).toEqual({ sort: ["newest"] });
  });

  it("sets the minRarity param", () => {
    render(<MarketFilters />);
    fireEvent.change(screen.getByLabelText("Static rarity"), { target: { value: "0.5" } });
    expect(lastPushedParams()).toEqual({ minRarity: ["0.5"] });
  });

  it("adds a mint-condition regime checkbox as its own param, appending to an existing one", () => {
    currentSearch = "regime=mid";
    render(<MarketFilters />);
    fireEvent.click(screen.getByRole("checkbox", { name: "At highs" }));
    expect(lastPushedParams()).toEqual({ regime: ["mid", "at-highs"] });
  });

  it("removes a regime when its checkbox is unchecked, keeping the others", () => {
    currentSearch = "regime=mid&regime=at-highs";
    render(<MarketFilters />);
    fireEvent.click(screen.getByRole("checkbox", { name: "At highs" }));
    expect(lastPushedParams()).toEqual({ regime: ["mid"] });
  });

  it("sets listed=1 when the listed-only checkbox is checked", () => {
    render(<MarketFilters />);
    fireEvent.click(screen.getByRole("checkbox", { name: "Listed only" }));
    expect(lastPushedParams()).toEqual({ listed: ["1"] });
  });

  it("clears the listed param when unchecked", () => {
    currentSearch = "listed=1";
    render(<MarketFilters />);
    fireEvent.click(screen.getByRole("checkbox", { name: "Listed only" }));
    expect(lastPushedParams()).toEqual({});
  });

  it("sets the sort param without resetting page for an unrelated existing filter", () => {
    currentSearch = "segment=MIXED";
    render(<MarketFilters />);
    fireEvent.change(screen.getByLabelText("Sort"), { target: { value: "price_desc" } });
    expect(lastPushedParams()).toEqual({ segment: ["MIXED"], sort: ["price_desc"] });
  });
});
