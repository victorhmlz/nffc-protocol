import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FeeCurveForm } from "@/components/admin/fee-curve-form";
import { createTestWagmiConfig, WagmiTestProviders } from "../../../tests/support/wagmi-test-config";

function renderForm(props: Parameters<typeof FeeCurveForm>[0]) {
  return render(
    <WagmiTestProviders config={createTestWagmiConfig()}>
      <FeeCurveForm {...props} />
    </WagmiTestProviders>,
  );
}

describe("FeeCurveForm", () => {
  it("prefills base and slope from the current curve, labelled by kind", () => {
    renderForm({ kind: "mint", current: { base: 1000n, slope: 500n } });
    expect(screen.getByText("Mint fee")).toBeInTheDocument();
    expect(screen.getByLabelText(/base/i)).toHaveValue("1000");
    expect(screen.getByLabelText(/slope/i)).toHaveValue("500");
  });

  it("labels the collection curve distinctly from the mint curve", () => {
    renderForm({ kind: "collection", current: { base: 0n, slope: 0n } });
    expect(screen.getByText("Collection creation fee")).toBeInTheDocument();
  });

  it("surfaces the honest 'not deployed yet' error without ever opening a wallet", async () => {
    renderForm({ kind: "mint", current: { base: 0n, slope: 0n } });
    fireEvent.click(screen.getByRole("button", { name: /update curve/i }));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent(/not deployed yet/i));
  });
});
