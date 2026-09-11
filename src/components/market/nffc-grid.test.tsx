import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { IndexedNffcSummary, MarketplaceQueryResult } from "@domain/marketplace/listings";
import { NffcGrid } from "@/components/market/nffc-grid";
import { createTestWagmiConfig, WagmiTestProviders } from "../../../tests/support/wagmi-test-config";

function item(tokenId: string): IndexedNffcSummary {
  return {
    tokenId,
    collectionId: "1",
    collectionName: "Blue Chips",
    creatorAddress: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    ownerAddress: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    segment: "CRYPTO_ONLY",
    staticRarity: 0.5,
    mintConditionRegime: "mid",
    componentCount: 1,
    components: [{ position: 0, assetId: `asset:${tokenId}`, assetSymbol: "BTC", assetClass: "CRYPTO", weightBps: 10_000 }],
    artURI: "data:image/svg+xml;charset=utf-8,x",
    mintedAt: "2026-01-01T00:00:00.000Z",
    listing: null,
  };
}

function renderGrid(result: MarketplaceQueryResult) {
  return render(
    <WagmiTestProviders config={createTestWagmiConfig()}>
      <NffcGrid result={result} />
    </WagmiTestProviders>,
  );
}

describe("NffcGrid — empty state vs. results, the one real branch of logic here", () => {
  it("shows an empty-state message and no list when there are no items", () => {
    renderGrid({ items: [], total: 0, page: 1, pageSize: 24 });
    expect(screen.getByText(/no nffcs match these filters/i)).toBeInTheDocument();
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });

  it("renders one card per item when there are results", () => {
    renderGrid({ items: [item("1"), item("2"), item("3")], total: 3, page: 1, pageSize: 24 });
    expect(screen.getByText("NFFC #1")).toBeInTheDocument();
    expect(screen.getByText("NFFC #2")).toBeInTheDocument();
    expect(screen.getByText("NFFC #3")).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(3);
  });
});
