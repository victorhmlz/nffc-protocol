import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { OfferSummary } from "@domain/nffc-detail/detail";
import { OffersList } from "@/components/nffc/offers-list";

const OFFER: OfferSummary = {
  offerId: "1",
  buyerAddress: "0x1111111111111111111111111111111111aaaa",
  priceWei: "1500000000000000000",
  expiry: "2099-01-01T00:00:00.000Z",
  active: true,
};

describe("OffersList", () => {
  it("shows an empty state, not a blank table, when there are no active offers", () => {
    render(<OffersList offers={[]} />);
    expect(screen.getByText(/no active offers/i)).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("lists each active offer's buyer, price, and expiry", () => {
    render(<OffersList offers={[OFFER]} />);
    expect(screen.getByText("0x1111…aaaa")).toBeInTheDocument();
    expect(screen.getByText("1.5 ETH")).toBeInTheDocument();
    expect(screen.getByRole("table")).toBeInTheDocument();
  });

  it("excludes inactive offers from the list", () => {
    render(<OffersList offers={[{ ...OFFER, active: false }]} />);
    expect(screen.getByText(/no active offers/i)).toBeInTheDocument();
  });
});
