import {
  http,
  type Abi,
  type PublicClient,
  createPublicClient,
  defineChain,
  fallback,
  parseAbiItem,
} from "viem";
import type { ChainReader, ContractCall } from "@domain/ports";
import type { ChainId } from "@domain/registry/types";
import type { RpcConfig } from "@config/types";
import { ROBINHOOD_CHAIN } from "@config/chain";
import { getConfig } from "@infra/env";
import { getLogger } from "@infra/logging/logger";

const DEFAULT_TIMEOUT_MS = 10_000;

export class RpcConfigError extends Error {
  override name = "RpcConfigError";
}

const robinhoodChain = defineChain({
  id: ROBINHOOD_CHAIN.chainId,
  name: ROBINHOOD_CHAIN.name,
  nativeCurrency: {
    name: "Ether",
    symbol: ROBINHOOD_CHAIN.nativeGasSymbol,
    decimals: 18,
  },
  // The real endpoints are supplied by the fallback transport below, not here.
  rpcUrls: { default: { http: [] } },
});

/**
 * viem-backed {@link ChainReader}. Multiple endpoints are wired through a
 * `fallback` transport — first primary, the rest automatic failover — so the
 * reader is not coupled to any single Robinhood Chain RPC
 * (`docs/spec/03-architecture.md` §5; TASK-04 acceptance).
 */
export function createChainReaderFromRpc(
  chainId: ChainId,
  rpc: RpcConfig,
  opts: { timeoutMs?: number } = {},
): ChainReader {
  if (rpc.endpoints.length === 0) {
    throw new RpcConfigError(
      `No RPC endpoints configured for chain ${chainId}`,
    );
  }
  const timeout = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  getLogger().debug(
    { component: "chain-reader", chainId, endpoints: rpc.endpoints.length },
    "chain reader created",
  );

  const client: PublicClient = createPublicClient({
    chain: chainId === ROBINHOOD_CHAIN.chainId ? robinhoodChain : undefined,
    transport: fallback(
      rpc.endpoints.map((url) => http(url, { timeout })),
      { retryCount: 0 },
    ),
  });

  return {
    chainId,
    getBlockNumber() {
      return client.getBlockNumber();
    },
    async readContract<TResult>(call: ContractCall): Promise<TResult> {
      const item = parseAbiItem(call.signature);
      if (item.type !== "function") {
        throw new RpcConfigError(
          `Signature is not a function: ${call.signature}`,
        );
      }
      const result = await client.readContract({
        address: call.address as `0x${string}`,
        abi: [item] as Abi,
        functionName: item.name,
        args: call.args as readonly unknown[],
      });
      return result as TResult;
    },
  };
}

/** Build a {@link ChainReader} for `chainId` from the loaded config. */
export function createChainReader(
  chainId: ChainId = ROBINHOOD_CHAIN.chainId,
): ChainReader {
  const rpc = getConfig().rpcByChainId[chainId];
  if (!rpc) {
    throw new RpcConfigError(
      `No RPC configuration for chain ${chainId}. Set RPC_${chainId}_URLS.`,
    );
  }
  return createChainReaderFromRpc(chainId, rpc);
}
