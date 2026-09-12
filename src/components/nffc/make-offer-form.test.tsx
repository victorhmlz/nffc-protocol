import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MakeOfferForm } from "@/components/nffc/make-offer-form";
import { createTestWagmiConfig, WagmiTestProviders } from "../../../tests/support/wagmi-test-config";

function renderForm() {
  return render(
    <WagmiTestProviders config={createTestWagmiConfig()}>
      <MakeOfferForm tokenId="7" />
    </WagmiTestProviders>,
  );
}

describe("MakeOfferForm", () => {
  it("renders a price input, an expiry select, and a submit button", () => {
    renderForm();
    expect(screen.getByLabelText(/offer price/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/expires in/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /make an offer on nffc #7/i })).toBeInTheDocument();
  });

  it("disables submit until a price is entered", () => {
    renderForm();
    expect(screen.getByRole("button", { name: /make an offer/i })).toBeDisabled();
    fireEvent.change(screen.getByLabelText(/offer price/i), { target: { value: "0.5" } });
    expect(screen.getByRole("button", { name: /make an offer/i })).not.toBeDisabled();
  });

  it("surfaces the honest 'not deployed yet' error without ever opening a wallet (acceptance)", async () => {
    renderForm();
    fireEvent.change(screen.getByLabelText(/offer price/i), { target: { value: "0.5" } });
    fireEvent.click(screen.getByRole("button", { name: /make an offer/i }));

    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(/marketplace is not deployed yet/i),
    );
  });
});
