// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ChainId } from "@domain/registry/types";
import {
  RpcConfigError,
  createChainReaderFromRpc,
} from "@infra/rpc/chain-reader";
import { resetConfigCache } from "@infra/env";
import { runChainReaderContract } from "../../tests/support/chain-reader-contract";
import { createFakeChainReader } from "../../tests/support/fakes";

const CHAIN = 4663 as ChainId;

function rpcResponse(result: unknown): Response {
  return new Response(JSON.stringify({ jsonrpc: "2.0", id: 1, result }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
  resetConfigCache();
});

runChainReaderContract("fake", () =>
  createFakeChainReader({ blockNumber: 42n }),
);

describe("createChainReaderFromRpc (viem)", () => {
  it("throws when given no endpoints", () => {
    expect(() => createChainReaderFromRpc(CHAIN, { endpoints: [] })).toThrow(
      RpcConfigError,
    );
  });

  it("reads the block number over a single endpoint", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => rpcResponse("0x10")),
    );
    const reader = createChainReaderFromRpc(CHAIN, {
      endpoints: ["https://rpc-a.example"],
    });
    expect(await reader.getBlockNumber()).toBe(16n);
  });

  it("fails over to the next endpoint when the first is unreachable", async () => {
    const fetchMock = vi.fn(async (input: string | URL | Request) => {
      const url = typeof input === "string" ? input : input.toString();
      if (url.includes("rpc-a")) throw new Error("ECONNREFUSED");
      return rpcResponse("0x2a");
    });
    vi.stubGlobal("fetch", fetchMock);

    const reader = createChainReaderFromRpc(CHAIN, {
      endpoints: ["https://rpc-a.example", "https://rpc-b.example"],
    });
    expect(await reader.getBlockNumber()).toBe(42n);
    expect(
      fetchMock.mock.calls.some(([i]) => String(i).includes("rpc-b")),
    ).toBe(true);
  });

  it("rejects a non-function signature in readContract", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => rpcResponse("0x0")),
    );
    const reader = createChainReaderFromRpc(CHAIN, {
      endpoints: ["https://rpc-a.example"],
    });
    await expect(
      reader.readContract({
        address: "0x0000000000000000000000000000000000000000" as never,
        signature: "event Transfer(address,address,uint256)",
        args: [],
      }),
    ).rejects.toThrow(RpcConfigError);
  });
});
