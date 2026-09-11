import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useConnect } from "wagmi";
import { useMintFlow } from "@/lib/wizard/use-mint-flow";
import { createTestWagmiConfig, WagmiTestProviders } from "../../../tests/support/wagmi-test-config";

function wrapper({ children }: { children: React.ReactNode }) {
  return <WagmiTestProviders config={createTestWagmiConfig()}>{children}</WagmiTestProviders>;
}

function setup(overrides: Partial<Parameters<typeof useMintFlow>[0]> = {}) {
  const prepareMetadata = vi.fn().mockResolvedValue("ipfs://meta");
  const simulateMint = vi.fn().mockResolvedValue(undefined);
  const buildMintCall = vi.fn().mockReturnValue({
    address: "0x0000000000000000000000000000000000000001",
    abi: [
      {
        type: "function",
        name: "mint",
        stateMutability: "nonpayable",
        inputs: [],
        outputs: [{ type: "uint256" }],
      },
    ],
    functionName: "mint",
  } as never);

  const { result } = renderHook(
    () => ({ connect: useConnect(), mintFlow: useMintFlow({ prepareMetadata, simulateMint, buildMintCall, ...overrides }) }),
    { wrapper },
  );
  return { result, prepareMetadata, simulateMint, buildMintCall };
}

async function connectWallet(result: ReturnType<typeof setup>["result"]) {
  await act(async () => {
    result.current.connect.connect({ connector: result.current.connect.connectors[0]! });
  });
  await waitFor(() => expect(result.current.connect.connectors.length).toBeGreaterThan(0));
}

describe("useMintFlow — simulation failures are communicated before a signature is requested (acceptance)", () => {
  it("never calls the wallet write when prepareMetadata rejects — state stays idle", async () => {
    const { result, simulateMint } = setup({
      prepareMetadata: vi.fn().mockRejectedValue(new Error("pin service down")),
    });
    await connectWallet(result);

    act(() => result.current.mintFlow.mint());

    await waitFor(() => expect(result.current.mintFlow.error).toBe("pin service down"));
    expect(result.current.mintFlow.state).toBe("idle");
    expect(simulateMint).not.toHaveBeenCalled();
  });

  it("never calls the wallet write when simulateMint rejects — state stays idle", async () => {
    const { result, buildMintCall } = setup({
      simulateMint: vi.fn().mockRejectedValue(new Error("would revert: WeightSumNot10000")),
    });
    await connectWallet(result);

    act(() => result.current.mintFlow.mint());

    await waitFor(() => expect(result.current.mintFlow.error).toBe("would revert: WeightSumNot10000"));
    expect(result.current.mintFlow.state).toBe("idle");
    expect(buildMintCall).not.toHaveBeenCalled();
  });

  it("shows isPreparing while prepareMetadata/simulateMint are in flight, then clears it", async () => {
    let resolvePrepare!: (uri: string) => void;
    const prepareMetadata = vi.fn(() => new Promise<string>((resolve) => (resolvePrepare = resolve)));
    const { result } = setup({ prepareMetadata });
    await connectWallet(result);

    act(() => result.current.mintFlow.mint());
    await waitFor(() => expect(result.current.mintFlow.isPreparing).toBe(true));

    await act(async () => {
      resolvePrepare("ipfs://meta");
    });
    await waitFor(() => expect(result.current.mintFlow.isPreparing).toBe(false));
  });
});

describe("useMintFlow — a successful simulation proceeds to the wallet", () => {
  it("calls buildMintCall and leaves idle only after both prepare and simulate succeed", async () => {
    const { result, buildMintCall } = setup();
    await connectWallet(result);

    expect(result.current.mintFlow.state).toBe("idle");
    act(() => result.current.mintFlow.mint());

    // Leaving "idle" is only possible via `request` (transactionFlowReducer),
    // which only fires after prepare+simulate resolve — proof the wallet was
    // engaged only post-simulation.
    await waitFor(() => expect(result.current.mintFlow.state).not.toBe("idle"));
    expect(buildMintCall).toHaveBeenCalledWith("ipfs://meta");
  });
});
