import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useAccount, useConnect } from "wagmi";
import { OfferRowActions, type OfferRowActionsProps } from "@/components/nffc/offer-row-actions";
import { createTestWagmiConfig, MOCK_ACCOUNT, WagmiTestProviders } from "../../../tests/support/wagmi-test-config";

const OTHER = "0x9999999999999999999999999999999999f00d";

/** Test-only harness — `OfferRowActions` itself has no connect control (a
 *  real page connects elsewhere), so tests drive the mock connector directly
 *  and surface connection status for `waitFor` to key off of. */
function Harness(props: OfferRowActionsProps) {
  const { connect, connectors } = useConnect();
  const { isConnected } = useAccount();
  return (
    <>
      <button type="button" onClick={() => connect({ connector: connectors[0]! })}>
        connect
      </button>
      <span data-testid="status">{isConnected ? "connected" : "disconnected"}</span>
      <OfferRowActions {...props} />
    </>
  );
}

function renderActions(props: { buyerAddress: string; ownerAddress: string }) {
  return render(
    <WagmiTestProviders config={createTestWagmiConfig()}>
      <Harness offerId="1" {...props} />
    </WagmiTestProviders>,
  );
}

async function connect() {
  fireEvent.click(screen.getByRole("button", { name: "connect" }));
  await waitFor(() => expect(screen.getByTestId("status")).toHaveTextContent("connected"));
}

describe("OfferRowActions", () => {
  it("renders nothing while disconnected", () => {
    renderActions({ buyerAddress: MOCK_ACCOUNT, ownerAddress: OTHER });
    expect(screen.queryByRole("button", { name: /accept|cancel/i })).not.toBeInTheDocument();
  });

  it("shows Cancel when the connected wallet is the offer's buyer", async () => {
    renderActions({ buyerAddress: MOCK_ACCOUNT, ownerAddress: OTHER });
    await connect();
    expect(screen.getByRole("button", { name: /cancel offer #1/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /accept/i })).not.toBeInTheDocument();
  });

  it("shows Accept when the connected wallet is the NFFC's owner", async () => {
    renderActions({ buyerAddress: OTHER, ownerAddress: MOCK_ACCOUNT });
    await connect();
    expect(screen.getByRole("button", { name: /accept offer #1/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /cancel/i })).not.toBeInTheDocument();
  });

  it("renders nothing when the connected wallet is neither the buyer nor the owner", async () => {
    renderActions({ buyerAddress: OTHER, ownerAddress: OTHER });
    await connect();
    expect(screen.queryByRole("button", { name: /accept|cancel/i })).not.toBeInTheDocument();
  });

  it("surfaces the honest 'not deployed yet' error on Cancel without ever opening a wallet", async () => {
    renderActions({ buyerAddress: MOCK_ACCOUNT, ownerAddress: OTHER });
    await connect();
    fireEvent.click(screen.getByRole("button", { name: /cancel offer #1/i }));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent(/marketplace is not deployed yet/i));
  });
});
