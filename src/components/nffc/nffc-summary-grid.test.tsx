import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { IndexedNffcSummary } from "@domain/marketplace/listings";
import { NffcSummaryGrid } from "@/components/nffc/nffc-summary-grid";
import { createTestWagmiConfig, WagmiTestProviders } from "../../../tests/support/wagmi-test-config";

const NFFC: IndexedNffcSummary = {
  tokenId: "7",
  collectionId: "2",
  collectionName: "Momentum Basket",
  creatorAddress: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  ownerAddress: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
  segment: "MIXED",
  staticRarity: 0.42,
  mintConditionRegime: "near-highs",
  componentCount: 1,
  components: [{ position: 0, assetId: "a", assetSymbol: "NVDA", assetClass: "EQUITY", weightBps: 10_000 }],
  artURI: "data:image/svg+xml;charset=utf-8,x",
  mintedAt: "2026-01-01T00:00:00.000Z",
  listing: null,
};

function renderGrid(items: readonly IndexedNffcSummary[], emptyLabel = "Nothing here yet.") {
  return render(
    <WagmiTestProviders config={createTestWagmiConfig()}>
      <NffcSummaryGrid items={items} emptyLabel={emptyLabel} />
    </WagmiTestProviders>,
  );
}

describe("NffcSummaryGrid", () => {
  it("shows the given empty-state message when there are no items", () => {
    renderGrid([], "Custom empty message.");
    expect(screen.getByText("Custom empty message.")).toBeInTheDocument();
  });

  it("renders one NffcCard per item", () => {
    renderGrid([NFFC]);
    expect(screen.getByText("NFFC #7")).toBeInTheDocument();
    expect(screen.getByText("Momentum Basket")).toBeInTheDocument();
  });
});
