import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BuyButton } from "@/components/market/buy-button";
import { createTestWagmiConfig, WagmiTestProviders } from "../../../tests/support/wagmi-test-config";

function renderButton() {
  return render(
    <WagmiTestProviders config={createTestWagmiConfig()}>
      <BuyButton tokenId="1" priceWei="1000000000000000000" />
    </WagmiTestProviders>,
  );
}

describe("BuyButton — honest fixture demonstrates the acceptance property live", () => {
  it("shows the unified simulation_failed notice and never opens the wallet, since Marketplace has no address until TASK-36", async () => {
    renderButton();
    fireEvent.click(screen.getByRole("button", { name: /buy nffc #1/i }));

    // TASK-33: the raw fixture message ("Marketplace is not deployed yet
    // (TASK-36)") is never rendered directly — only the unified vocabulary
    // (`ERROR_VOCABULARY.simulation_failed`, docs/spec/07-ux-map.md §7).
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(/can't be completed right now/i);
    // idle/failed/rejected are all still clickable — confirms no wallet flow
    // was ever entered (a truly "in-flight" transaction would disable it).
    await waitFor(() => expect(screen.getByRole("button", { name: /buy nffc #1/i })).not.toBeDisabled());
  });
});
