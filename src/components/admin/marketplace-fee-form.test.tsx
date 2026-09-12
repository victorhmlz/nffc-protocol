import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MarketplaceFeeForm } from "@/components/admin/marketplace-fee-form";
import { createTestWagmiConfig, WagmiTestProviders } from "../../../tests/support/wagmi-test-config";

function renderForm(currentBps: number) {
  return render(
    <WagmiTestProviders config={createTestWagmiConfig()}>
      <MarketplaceFeeForm currentBps={currentBps} />
    </WagmiTestProviders>,
  );
}

describe("MarketplaceFeeForm", () => {
  it("prefills the current bps", () => {
    renderForm(150);
    expect(screen.getByLabelText(/marketplace fee/i)).toHaveValue(150);
  });

  it("surfaces the honest 'not deployed yet' error without ever opening a wallet", async () => {
    renderForm(150);
    fireEvent.click(screen.getByRole("button", { name: /update/i }));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent(/not deployed yet/i));
  });
});
