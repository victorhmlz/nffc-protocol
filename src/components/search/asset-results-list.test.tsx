import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AssetResultsList } from "@/components/search/asset-results-list";

describe("AssetResultsList", () => {
  it("shows an empty-state message when there are no matches", () => {
    render(<AssetResultsList assets={[]} />);
    expect(screen.getByText(/no matching assets/i)).toBeInTheDocument();
  });

  it("lists each asset with its class and NFFC count", () => {
    render(
      <AssetResultsList
        assets={[{ assetId: "a", assetSymbol: "NVDA", assetClass: "EQUITY", nffcCount: 3 }]}
      />,
    );
    expect(screen.getByText("NVDA")).toBeInTheDocument();
    expect(screen.getByText(/stock token.*3 nffcs/i)).toBeInTheDocument();
  });

  it("labels a crypto asset distinctly from a stock token", () => {
    render(
      <AssetResultsList
        assets={[{ assetId: "b", assetSymbol: "BTC", assetClass: "CRYPTO", nffcCount: 1 }]}
      />,
    );
    expect(screen.getByText(/crypto.*1 nffc$/i)).toBeInTheDocument();
  });
});
