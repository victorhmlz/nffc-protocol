import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RegisterAssetForm } from "@/components/admin/register-asset-form";
import { createTestWagmiConfig, WagmiTestProviders } from "../../../tests/support/wagmi-test-config";

function renderForm() {
  return render(
    <WagmiTestProviders config={createTestWagmiConfig()}>
      <RegisterAssetForm />
    </WagmiTestProviders>,
  );
}

describe("RegisterAssetForm", () => {
  it("disables submit until symbol and name are entered", () => {
    renderForm();
    expect(screen.getByRole("button", { name: /register asset/i })).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Symbol"), { target: { value: "NVDA" } });
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "NVIDIA Corporation" } });
    expect(screen.getByRole("button", { name: /register asset/i })).not.toBeDisabled();
  });

  it("surfaces the honest 'not deployed yet' error without ever opening a wallet", async () => {
    renderForm();
    fireEvent.change(screen.getByLabelText("Symbol"), { target: { value: "NVDA" } });
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "NVIDIA Corporation" } });
    fireEvent.click(screen.getByRole("button", { name: /register asset/i }));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent(/not deployed yet/i));
  });
});
