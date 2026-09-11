import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useConnect } from "wagmi";
import { useBuyFlow } from "@/lib/marketplace/use-buy-flow";
import { createTestWagmiConfig, WagmiTestProviders } from "../../../tests/support/wagmi-test-config";

function wrapper({ children }: { children: React.ReactNode }) {
  return <WagmiTestProviders config={createTestWagmiConfig()}>{children}</WagmiTestProviders>;
}

function setup(overrides: Partial<Parameters<typeof useBuyFlow>[0]> = {}) {
  const simulateBuy = vi.fn().mockResolvedValue(undefined);
  const buildBuyCall = vi.fn().mockReturnValue({
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
    () => ({ connect: useConnect(), buyFlow: useBuyFlow({ simulateBuy, buildBuyCall, ...overrides }) }),
    { wrapper },
  );
  return { result, simulateBuy, buildBuyCall };
}

async function connectWallet(result: ReturnType<typeof setup>["result"]) {
  await act(async () => {
    result.current.connect.connect({ connector: result.current.connect.connectors[0]! });
  });
  await waitFor(() => expect(result.current.connect.connectors.length).toBeGreaterThan(0));
}

describe("useBuyFlow — a simulation failure is communicated before a signature is requested (acceptance)", () => {
  it("never calls the wallet write when simulateBuy rejects — state stays idle", async () => {
    const { result, buildBuyCall } = setup({
      simulateBuy: vi.fn().mockRejectedValue(new Error("would revert: ListingNotActive")),
    });
    await connectWallet(result);

    act(() => result.current.buyFlow.buy());

    await waitFor(() => expect(result.current.buyFlow.error).toBe("would revert: ListingNotActive"));
    expect(result.current.buyFlow.state).toBe("idle");
    expect(buildBuyCall).not.toHaveBeenCalled();
  });

  it("shows isSimulating while simulateBuy is in flight, then clears it", async () => {
    let resolveSim!: () => void;
    const simulateBuy = vi.fn(() => new Promise<void>((resolve) => (resolveSim = resolve)));
    const { result } = setup({ simulateBuy });
    await connectWallet(result);

    act(() => result.current.buyFlow.buy());
    await waitFor(() => expect(result.current.buyFlow.isSimulating).toBe(true));

    await act(async () => {
      resolveSim();
    });
    await waitFor(() => expect(result.current.buyFlow.isSimulating).toBe(false));
  });
});

describe("useBuyFlow — a successful simulation proceeds to the wallet", () => {
  it("calls buildBuyCall and leaves idle only after simulation succeeds", async () => {
    const { result, buildBuyCall } = setup();
    await connectWallet(result);

    expect(result.current.buyFlow.state).toBe("idle");
    act(() => result.current.buyFlow.buy());

    await waitFor(() => expect(result.current.buyFlow.state).not.toBe("idle"));
    expect(buildBuyCall).toHaveBeenCalled();
  });
});
