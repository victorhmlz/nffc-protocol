import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useConnect } from "wagmi";
import { NetworkBanner } from "@/components/wallet/network-banner";
import { robinhoodChain } from "@/lib/wallet/chain";
import {
  createTestWagmiConfig,
  WagmiTestProviders,
  wrongChain,
} from "../../../tests/support/wagmi-test-config";

/** Connects the mock connector to a given chain, then renders `NetworkBanner`. */
function ConnectTo({
  chainId,
  children,
}: {
  chainId?: number;
  children: React.ReactNode;
}) {
  const { connect, connectors } = useConnect();
  return (
    <div>
      <button onClick={() => connect({ connector: connectors[0]!, chainId })}>
        connect
      </button>
      {children}
    </div>
  );
}

describe("NetworkBanner", () => {
  it("renders nothing when no wallet is connected", () => {
    const config = createTestWagmiConfig();
    render(
      <WagmiTestProviders config={config}>
        <NetworkBanner />
      </WagmiTestProviders>,
    );
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("renders nothing when connected to Robinhood Chain", async () => {
    const config = createTestWagmiConfig();
    render(
      <WagmiTestProviders config={config}>
        <ConnectTo chainId={robinhoodChain.id}>
          <NetworkBanner />
        </ConnectTo>
      </WagmiTestProviders>,
    );
    fireEvent.click(screen.getByText("connect"));
    await waitFor(() =>
      expect(screen.queryByRole("alert")).not.toBeInTheDocument(),
    );
  });

  it("warns and offers a switch when connected to the wrong chain", async () => {
    const config = createTestWagmiConfig();
    render(
      <WagmiTestProviders config={config}>
        <ConnectTo chainId={wrongChain.id}>
          <NetworkBanner />
        </ConnectTo>
      </WagmiTestProviders>,
    );
    fireEvent.click(screen.getByText("connect"));

    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
    expect(screen.getByRole("alert")).toHaveTextContent(String(wrongChain.id));
    expect(screen.getByRole("alert")).toHaveTextContent(
      String(robinhoodChain.id),
    );

    fireEvent.click(screen.getByRole("button", { name: /switch network/i }));
    await waitFor(() =>
      expect(screen.queryByRole("alert")).not.toBeInTheDocument(),
    );
  });
});
