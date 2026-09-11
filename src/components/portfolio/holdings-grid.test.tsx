import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { IndexedNffcSummary } from "@domain/marketplace/listings";
import type { NffcMarketSnapshot } from "@domain/metadata/metadata";
import type { Portfolio } from "@domain/portfolio/portfolio";
import { HoldingsGrid } from "@/components/portfolio/holdings-grid";
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

const MARKET: NffcMarketSnapshot = {
  tokenId: "7",
  referenceNav: null,
  components: [],
  performance: [],
  asOf: 1_800_000_000,
  degraded: true,
  unavailableReason: "no engine yet",
};

function portfolio(overrides: Partial<Portfolio> = {}): Portfolio {
  return {
    ownerAddress: NFFC.ownerAddress,
    holdings: [],
    totalReferenceValue: 0,
    degraded: false,
    performance: [],
    exposureByAsset: [],
    exposureBySegment: [],
    exposureByCollection: [],
    asOf: 1_800_000_000 as never,
    ...overrides,
  };
}

function renderGrid(p: Portfolio) {
  return render(
    <WagmiTestProviders config={createTestWagmiConfig()}>
      <HoldingsGrid portfolio={p} />
    </WagmiTestProviders>,
  );
}

describe("HoldingsGrid", () => {
  it("shows an explicit empty state when the wallet holds nothing", () => {
    renderGrid(portfolio());
    expect(screen.getByText(/doesn.t hold any NFFCs/i)).toBeInTheDocument();
  });

  it("renders one NffcCard per holding", () => {
    renderGrid(portfolio({ holdings: [{ nffc: NFFC, market: MARKET }] }));
    expect(screen.getByText("NFFC #7")).toBeInTheDocument();
    expect(screen.getByText("Momentum Basket")).toBeInTheDocument();
  });
});
