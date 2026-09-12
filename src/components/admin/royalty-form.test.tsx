import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RoyaltyForm } from "@/components/admin/royalty-form";
import { createTestWagmiConfig, WagmiTestProviders } from "../../../tests/support/wagmi-test-config";

function renderForm() {
  return render(
    <WagmiTestProviders config={createTestWagmiConfig()}>
      <RoyaltyForm />
    </WagmiTestProviders>,
  );
}

describe("RoyaltyForm", () => {
  it("disables submit until both fields are filled", () => {
    renderForm();
    expect(screen.getByRole("button", { name: /set royalty/i })).toBeDisabled();
    fireEvent.change(screen.getByLabelText(/collection id/i), { target: { value: "1" } });
    fireEvent.change(screen.getByLabelText(/royalty/i), { target: { value: "250" } });
    expect(screen.getByRole("button", { name: /set royalty/i })).not.toBeDisabled();
  });

  it("surfaces the honest 'not deployed yet' error without ever opening a wallet", async () => {
    renderForm();
    fireEvent.change(screen.getByLabelText(/collection id/i), { target: { value: "1" } });
    fireEvent.change(screen.getByLabelText(/royalty/i), { target: { value: "250" } });
    fireEvent.click(screen.getByRole("button", { name: /set royalty/i }));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent(/not deployed yet/i));
  });
});
