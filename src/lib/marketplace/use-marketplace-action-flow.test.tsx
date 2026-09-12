import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useConnect } from "wagmi";
import { useMarketplaceActionFlow } from "@/lib/marketplace/use-marketplace-action-flow";
import { createTestWagmiConfig, WagmiTestProviders } from "../../../tests/support/wagmi-test-config";

function wrapper({ children }: { children: React.ReactNode }) {
  return <WagmiTestProviders config={createTestWagmiConfig()}>{children}</WagmiTestProviders>;
}

function setup(overrides: Partial<Parameters<typeof useMarketplaceActionFlow>[0]> = {}) {
  const simulate = vi.fn().mockResolvedValue(undefined);
  const buildCall = vi.fn().mockReturnValue({
    address: "0x0000000000000000000000000000000000000002",
    abi: [
      {
        type: "function",
        name: "buy",
        stateMutability: "payable",
        inputs: [{ type: "uint256" }],
        outputs: [],
      },
    ],
    functionName: "buy",
  } as never);

  const { result } = renderHook(
    () => ({ connect: useConnect(), flow: useMarketplaceActionFlow({ simulate, buildCall, ...overrides }) }),
    { wrapper },
  );
  return { result, simulate, buildCall };
}

async function connectWallet(result: ReturnType<typeof setup>["result"]) {
  await act(async () => {
    result.current.connect.connect({ connector: result.current.connect.connectors[0]! });
  });
  await waitFor(() => expect(result.current.connect.connectors.length).toBeGreaterThan(0));
}

describe("useMarketplaceActionFlow — a simulation failure is communicated before a signature is requested (acceptance)", () => {
  it("never calls the wallet write when simulate rejects — state stays idle", async () => {
    const { result, buildCall } = setup({
      simulate: vi.fn().mockRejectedValue(new Error("would revert: OfferExpired")),
    });
    await connectWallet(result);

    act(() => result.current.flow.execute());

    await waitFor(() => expect(result.current.flow.error).toBe("would revert: OfferExpired"));
    expect(result.current.flow.state).toBe("idle");
    expect(buildCall).not.toHaveBeenCalled();
  });

  it("shows isSimulating while simulate is in flight, then clears it", async () => {
    let resolveSim!: () => void;
    const simulate = vi.fn(() => new Promise<void>((resolve) => (resolveSim = resolve)));
    const { result } = setup({ simulate });
    await connectWallet(result);

    act(() => result.current.flow.execute());
    await waitFor(() => expect(result.current.flow.isSimulating).toBe(true));

    await act(async () => {
      resolveSim();
    });
    await waitFor(() => expect(result.current.flow.isSimulating).toBe(false));
  });
});

describe("useMarketplaceActionFlow — a successful simulation proceeds to the wallet", () => {
  it("calls buildCall and leaves idle only after simulation succeeds", async () => {
    const { result, buildCall } = setup();
    await connectWallet(result);

    expect(result.current.flow.state).toBe("idle");
    act(() => result.current.flow.execute());

    await waitFor(() => expect(result.current.flow.state).not.toBe("idle"));
    expect(buildCall).toHaveBeenCalled();
  });
});
