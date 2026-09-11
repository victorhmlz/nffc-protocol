import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { OfferSummary } from "@domain/nffc-detail/detail";
import { OffersList } from "@/components/nffc/offers-list";
import { createTestWagmiConfig, WagmiTestProviders } from "../../../tests/support/wagmi-test-config";

const OWNER = "0x2222222222222222222222222222222222bbbb";

const OFFER: OfferSummary = {
  offerId: "1",
  buyerAddress: "0x1111111111111111111111111111111111aaaa",
  priceWei: "1500000000000000000",
  expiry: "2099-01-01T00:00:00.000Z",
  active: true,
};

function renderList(offers: readonly OfferSummary[]) {
  return render(
    <WagmiTestProviders config={createTestWagmiConfig()}>
      <OffersList tokenId="7" ownerAddress={OWNER} offers={offers} />
    </WagmiTestProviders>,
  );
}

describe("OffersList", () => {
  it("shows an empty state, not a blank table, when there are no active offers", () => {
    renderList([]);
    expect(screen.getByText(/no active offers/i)).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("lists each active offer's buyer, price, and expiry", () => {
    renderList([OFFER]);
    expect(screen.getByText("0x1111…aaaa")).toBeInTheDocument();
    expect(screen.getByText("1.5 ETH")).toBeInTheDocument();
    expect(screen.getByRole("table")).toBeInTheDocument();
  });

  it("excludes inactive offers from the list", () => {
    renderList([{ ...OFFER, active: false }]);
    expect(screen.getByText(/no active offers/i)).toBeInTheDocument();
  });

  it("always renders the make-offer form, even with no active offers", () => {
    renderList([]);
    expect(screen.getByLabelText(/offer price/i)).toBeInTheDocument();
  });
});
