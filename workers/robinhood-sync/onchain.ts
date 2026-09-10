import {
  type Address,
  type Hex,
  createPublicClient,
  createWalletClient,
  http,
  parseAbi,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { ROBINHOOD_CHAIN } from "@config/chain";
import { ROBINHOOD_PROVIDER_ID } from "./reconcile";
import type { OnChainRepresentation, RobinhoodToken } from "./types";
import type { RobinhoodSyncConfig } from "./config";

const REGISTRY_ABI = parseAbi([
  "struct OracleMetadata { address feed; uint32 heartbeat; uint8 feedDecimals; }",
  "struct Representation { bytes32 representationId; bytes32 assetId; bytes32 providerId; uint256 chainId; address token; bytes32 tokenStandard; uint8 decimals; uint256 multiplier; OracleMetadata oracle; uint8 status; uint64 createdAt; uint64 updatedAt; }",
  "function getRepresentationsByProvider(bytes32 providerId) view returns (bytes32[])",
  "function getRepresentation(bytes32 representationId) view returns (Representation)",
]);

const ADAPTER_ABI = parseAbi([
  "struct OracleMetadata { address feed; uint32 heartbeat; uint8 feedDecimals; }",
  "struct SyncEntry { string symbol; string name; address token; uint8 decimals; uint256 multiplier; OracleMetadata oracle; }",
  "function syncUpsert(SyncEntry e) returns (bytes32)",
  "function syncDeactivateByToken(address token)",
]);

const REP_STATUS_ACTIVE = 1;

const chain = {
  id: ROBINHOOD_CHAIN.chainId,
  name: ROBINHOOD_CHAIN.name,
  nativeCurrency: {
    name: "Ether",
    symbol: ROBINHOOD_CHAIN.nativeGasSymbol,
    decimals: 18,
  },
  rpcUrls: { default: { http: [] as string[] } },
} as const;

export interface OnchainClients {
  readOnChain(): Promise<readonly OnChainRepresentation[]>;
  upsert(token: RobinhoodToken): Promise<void>;
  deactivate(entry: { representationId: Hex; token: Address }): Promise<void>;
}

/**
 * Live viem read/write against the deployed `RepresentationRegistry` (reads) and
 * `RobinhoodAdapter` (writes). Only reachable once the contracts are deployed
 * and the sync key is set; behaviour against a real chain is exercised in
 * TASK-31 (testnet).
 */
export function createOnchainClients(
  cfg: Extract<RobinhoodSyncConfig, { configured: true }>,
  rpcUrl: string,
): OnchainClients {
  const publicClient = createPublicClient({ chain, transport: http(rpcUrl) });
  const account = privateKeyToAccount(cfg.syncPrivateKey);
  const walletClient = createWalletClient({
    account,
    chain,
    transport: http(rpcUrl),
  });

  return {
    async readOnChain() {
      const ids = await publicClient.readContract({
        address: cfg.representationRegistry,
        abi: REGISTRY_ABI,
        functionName: "getRepresentationsByProvider",
        args: [ROBINHOOD_PROVIDER_ID],
      });
      const reps = await Promise.all(
        ids.map((id) =>
          publicClient.readContract({
            address: cfg.representationRegistry,
            abi: REGISTRY_ABI,
            functionName: "getRepresentation",
            args: [id],
          }),
        ),
      );
      return reps.map((r) => ({
        representationId: r.representationId,
        token: r.token,
        active: r.status === REP_STATUS_ACTIVE,
        oracle: {
          feed: r.oracle.feed,
          heartbeat: Number(r.oracle.heartbeat),
          feedDecimals: Number(r.oracle.feedDecimals),
        },
      }));
    },

    async upsert(token) {
      const hash = await walletClient.writeContract({
        address: cfg.robinhoodAdapter,
        abi: ADAPTER_ABI,
        functionName: "syncUpsert",
        args: [
          {
            symbol: token.symbol,
            name: token.name,
            token: token.token,
            decimals: token.decimals,
            multiplier: token.multiplier,
            oracle: {
              feed: token.oracle.feed,
              heartbeat: token.oracle.heartbeat,
              feedDecimals: token.oracle.feedDecimals,
            },
          },
        ],
      });
      await publicClient.waitForTransactionReceipt({ hash });
    },

    async deactivate(entry) {
      const hash = await walletClient.writeContract({
        address: cfg.robinhoodAdapter,
        abi: ADAPTER_ABI,
        functionName: "syncDeactivateByToken",
        args: [entry.token],
      });
      await publicClient.waitForTransactionReceipt({ hash });
    },
  };
}
