import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const push = vi.fn();
let currentSearch = "";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
  useSearchParams: () => new URLSearchParams(currentSearch),
}));

import { ActivityFilters } from "@/components/activity/activity-filters";

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

describe("ActivityFilters — renders every control", () => {
  it("renders wallet, NFFC, and every kind checkbox", () => {
    render(<ActivityFilters />);
    expect(screen.getByLabelText("Wallet")).toBeInTheDocument();
    expect(screen.getByLabelText("NFFC #")).toBeInTheDocument();
    for (const label of ["Minted", "Transferred", "Listed", "Sold", "Offer made"]) {
      expect(screen.getByRole("checkbox", { name: label })).toBeInTheDocument();
    }
  });
});

describe("ActivityFilters — URL query-param string-building", () => {
  it("sets the wallet and tokenId params on submit, resetting page", () => {
    currentSearch = "page=3";
    render(<ActivityFilters />);
    fireEvent.change(screen.getByLabelText("Wallet"), { target: { value: "0xabc" } });
    fireEvent.change(screen.getByLabelText("NFFC #"), { target: { value: "7" } });
    fireEvent.click(screen.getByRole("button", { name: /apply/i }));

    expect(lastPushedParams()).toEqual({ wallet: ["0xabc"], tokenId: ["7"] });
  });

  it("clears a param when its input is emptied on submit", () => {
    currentSearch = "wallet=0xabc";
    render(<ActivityFilters />);
    fireEvent.change(screen.getByLabelText("Wallet"), { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: /apply/i }));

    expect(lastPushedParams()).toEqual({});
  });

  it("adds a kind checkbox as its own param, appending to an existing one", () => {
    currentSearch = "kind=SALE";
    render(<ActivityFilters />);
    fireEvent.click(screen.getByRole("checkbox", { name: "Minted" }));
    expect(lastPushedParams()).toEqual({ kind: ["SALE", "MINT"] });
  });

  it("removes a kind when its checkbox is unchecked, keeping the others", () => {
    currentSearch = "kind=SALE&kind=MINT";
    render(<ActivityFilters />);
    fireEvent.click(screen.getByRole("checkbox", { name: "Minted" }));
    expect(lastPushedParams()).toEqual({ kind: ["SALE"] });
  });

  it("preserves an unrelated existing param (e.g. kind) when applying text filters", () => {
    currentSearch = "kind=SALE";
    render(<ActivityFilters />);
    fireEvent.change(screen.getByLabelText("Wallet"), { target: { value: "0xabc" } });
    fireEvent.click(screen.getByRole("button", { name: /apply/i }));
    expect(lastPushedParams()).toEqual({ kind: ["SALE"], wallet: ["0xabc"] });
  });
});
