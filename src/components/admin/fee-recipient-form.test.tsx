import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FeeRecipientForm } from "@/components/admin/fee-recipient-form";
import { createTestWagmiConfig, WagmiTestProviders } from "../../../tests/support/wagmi-test-config";

const ADDRESS = "0x1111111111111111111111111111111111aaaa";

function renderForm() {
  return render(
    <WagmiTestProviders config={createTestWagmiConfig()}>
      <FeeRecipientForm currentRecipient={ADDRESS} />
    </WagmiTestProviders>,
  );
}

describe("FeeRecipientForm", () => {
  it("prefills the current recipient", () => {
    renderForm();
    expect(screen.getByLabelText(/fee recipient/i)).toHaveValue(ADDRESS);
  });

  it("surfaces the honest 'not deployed yet' error without ever opening a wallet", async () => {
    renderForm();
    fireEvent.click(screen.getByRole("button", { name: /update/i }));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent(/not deployed yet/i));
  });
});
