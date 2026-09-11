import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { IndexedNffcSummary } from "@domain/marketplace/listings";
import { NffcCard } from "@/components/market/nffc-card";
import { createTestWagmiConfig, WagmiTestProviders } from "../../../tests/support/wagmi-test-config";

const LISTED: IndexedNffcSummary = {
  tokenId: "7",
  collectionId: "2",
  collectionName: "Momentum Basket",
  creatorAddress: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  ownerAddress: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
  segment: "MIXED",
  staticRarity: 0.42,
  mintConditionRegime: "near-highs",
  componentCount: 3,
  components: [{ position: 0, assetId: "a", assetSymbol: "NVDA", assetClass: "EQUITY", weightBps: 10_000 }],
  artURI: "data:image/svg+xml;charset=utf-8,x",
  mintedAt: "2026-01-01T00:00:00.000Z",
  listing: { sellerAddress: "0xcccccccccccccccccccccccccccccccccccccccc", priceWei: "2500000000000000000", active: true },
};

function renderCard(nffc: IndexedNffcSummary) {
  return render(
    <WagmiTestProviders config={createTestWagmiConfig()}>
      <NffcCard nffc={nffc} />
    </WagmiTestProviders>,
  );
}

describe("NffcCard — representative render", () => {
  it("shows identity, segment, rarity, mint condition, price, and a Buy button when listed", () => {
    renderCard(LISTED);
    expect(screen.getByText("NFFC #7")).toBeInTheDocument();
    expect(screen.getByText("Momentum Basket")).toBeInTheDocument();
    expect(screen.getByText("Mixed")).toBeInTheDocument();
    expect(screen.getByText("Minted near highs")).toBeInTheDocument();
    expect(screen.getByText("2.5 ETH")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /buy nffc #7/i })).toBeInTheDocument();
  });

  it("shows 'Not listed' and no Buy button when there is no active listing", () => {
    renderCard({ ...LISTED, listing: null });
    expect(screen.getByText("Not listed")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /buy/i })).not.toBeInTheDocument();
  });

  // TASK-08 acceptance, wired here as of the TASK-20 review (see
  // docs/reports/TASK-08-REPORT.md's correction note): the geographic-
  // eligibility disclosure must be shown wherever a segment is displayed —
  // /market is the first public, SEO-indexed, mass-grid surface that does.
  it("shows the geographic-eligibility disclosure (TASK-08 acceptance)", () => {
    renderCard(LISTED);
    expect(screen.getByRole("note")).toHaveTextContent(/geographic restriction/i);
  });

  it("shows the not-restricted note for a crypto-only NFFC", () => {
    renderCard({ ...LISTED, segment: "CRYPTO_ONLY" });
    expect(screen.getByRole("note")).toHaveTextContent(/not subject to the stock token geographic restriction/i);
  });
});
