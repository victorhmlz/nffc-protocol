import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { AssetIdentity } from "@domain/registry/types";
import { RegisterRepresentationForm } from "@/components/admin/register-representation-form";
import { createTestWagmiConfig, WagmiTestProviders } from "../../../tests/support/wagmi-test-config";

const ASSETS: AssetIdentity[] = [
  { assetId: "asset:nvda" as never, symbol: "NVDA", name: "NVIDIA Corporation", assetClass: "EQUITY", status: "ACTIVE" },
  { assetId: "asset:btc" as never, symbol: "BTC", name: "Bitcoin", assetClass: "CRYPTO", status: "ACTIVE" },
];

function renderForm() {
  return render(
    <WagmiTestProviders config={createTestWagmiConfig()}>
      <RegisterRepresentationForm assets={ASSETS} />
    </WagmiTestProviders>,
  );
}

describe("RegisterRepresentationForm", () => {
  it("lists every asset as an option and disables submit until a token address is entered", () => {
    renderForm();
    expect(screen.getByRole("option", { name: "NVDA" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "BTC" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /register representation/i })).toBeDisabled();
    fireEvent.change(screen.getByLabelText(/token address/i), { target: { value: "0xabc" } });
    expect(screen.getByRole("button", { name: /register representation/i })).not.toBeDisabled();
  });

  it("surfaces the unified simulation_failed notice without ever opening a wallet", async () => {
    renderForm();
    fireEvent.change(screen.getByLabelText(/token address/i), { target: { value: "0xabc" } });
    fireEvent.click(screen.getByRole("button", { name: /register representation/i }));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent(/can't be completed right now/i));
  });
});
