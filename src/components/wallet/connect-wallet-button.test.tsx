import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ConnectWalletButton } from "@/components/wallet/connect-wallet-button";
import {
  createTestWagmiConfig,
  MOCK_ACCOUNT,
  WagmiTestProviders,
} from "../../../tests/support/wagmi-test-config";

function renderButton(defaultConnected = false) {
  const config = createTestWagmiConfig({ defaultConnected });
  return render(
    <WagmiTestProviders config={config}>
      <ConnectWalletButton />
    </WagmiTestProviders>,
  );
}

describe("ConnectWalletButton", () => {
  it("offers to connect when no wallet is connected", () => {
    renderButton();
    expect(
      screen.getByRole("button", { name: /connect mock connector/i }),
    ).toBeInTheDocument();
  });

  it("connects via the mock connector and shows the truncated address + Disconnect", async () => {
    renderButton();

    fireEvent.click(
      screen.getByRole("button", { name: /connect mock connector/i }),
    );

    await waitFor(() => {
      expect(
        screen.getByText(
          `${MOCK_ACCOUNT.slice(0, 6)}…${MOCK_ACCOUNT.slice(-4)}`,
        ),
      ).toBeInTheDocument();
    });
    expect(
      screen.getByRole("button", { name: /disconnect/i }),
    ).toBeInTheDocument();
  });

  it("disconnects back to the connect prompt", async () => {
    renderButton();
    fireEvent.click(
      screen.getByRole("button", { name: /connect mock connector/i }),
    );
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: /disconnect/i }),
      ).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByRole("button", { name: /disconnect/i }));

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /connect mock connector/i }),
      ).toBeInTheDocument();
    });
  });

  it("never offers a custodial connector — only the configured self-custody ones", () => {
    renderButton();
    expect(screen.queryByText(/exchange|custodial/i)).not.toBeInTheDocument();
  });
});
