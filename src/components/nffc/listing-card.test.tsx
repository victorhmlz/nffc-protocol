import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ListingCard } from "@/components/nffc/listing-card";
import { createTestWagmiConfig, WagmiTestProviders } from "../../../tests/support/wagmi-test-config";

function renderCard(listing: Parameters<typeof ListingCard>[0]["listing"]) {
  return render(
    <WagmiTestProviders config={createTestWagmiConfig()}>
      <ListingCard tokenId="7" listing={listing} />
    </WagmiTestProviders>,
  );
}

describe("ListingCard", () => {
  it("shows the price, seller, and a Buy button when actively listed", () => {
    renderCard({ sellerAddress: "0x1111111111111111111111111111111111aaaa", priceWei: "2500000000000000000", active: true });
    expect(screen.getByText("2.5 ETH")).toBeInTheDocument();
    expect(screen.getByText("Seller 0x1111…aaaa")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /buy nffc #7/i })).toBeInTheDocument();
  });

  it("shows 'Not listed' and no Buy button when there is no active listing", () => {
    renderCard(null);
    expect(screen.getByText("Not listed")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /buy/i })).not.toBeInTheDocument();
  });
});
