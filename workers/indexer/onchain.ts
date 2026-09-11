/**
 * Real `BlockchainEventSource` (`domain/ports/event-source.ts`) over viem —
 * untested directly, the same boundary `workers/provider-sync/onchain.ts`
 * and `infra/rpc/chain-reader.ts` already accept (full correctness is only
 * provable against a live chain, once TASK-31 deploys the contracts this
 * reads from). All the logic that actually matters for TASK-24's acceptance
 * (idempotency, resumption) lives in `domain/indexer/` and `run.ts`, both
 * fully unit-tested against a fake of this port.
 */
import { createPublicClient, fallback, http, parseAbiItem, type Address as ViemAddress } from "viem";
import type { BlockchainEventSource, EventRange, LogEvent } from "@domain/ports/event-source";
import type { Address, UnixSeconds } from "@domain/shared/branded";

/** Blocks below the chain head treated as final — mirrors the intent of
 *  `infra/rpc/chain-reader.ts`'s multi-endpoint reader without depending on
 *  it (that port has no `getLogs`/transaction-lookup capability). */
const REORG_SAFE_DEPTH = 12n;

const EVENT_ABI_ITEMS = [
  parseAbiItem(
    "event NFFCMinted(uint256 indexed tokenId, uint256 indexed collectionId, address indexed creator, bytes32 compositionHash, uint16 componentCount)",
  ),
  parseAbiItem(
    "event NFFCCompositionRecorded(uint256 indexed tokenId, (bytes32 assetId, bytes32 representationId, uint16 weightBps)[] components)",
  ),
  parseAbiItem("event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)"),
  parseAbiItem("event ListingCreated(uint256 indexed tokenId, address indexed seller, uint256 price)"),
  parseAbiItem("event ListingCancelled(uint256 indexed tokenId, address indexed seller)"),
  parseAbiItem(
    "event Sale(uint256 indexed tokenId, address indexed seller, address indexed buyer, uint256 price, uint256 feePaid, uint256 royaltyPaid)",
  ),
  parseAbiItem(
    "event OfferCreated(uint256 indexed offerId, uint256 indexed tokenId, address indexed buyer, uint256 price, uint64 expiry)",
  ),
  parseAbiItem("event OfferCancelled(uint256 indexed offerId)"),
  parseAbiItem(
    "event OfferAccepted(uint256 indexed offerId, uint256 indexed tokenId, address seller, address buyer, uint256 price)",
  ),
] as const;

/**
 * `(blockNumber) => its timestamp`, cached per block — most events in one
 * indexer pass share a handful of blocks, so this avoids re-fetching the
 * same block repeatedly within a run (a fresh cache per worker invocation;
 * it doesn't persist across runs, which is fine — a few redundant lookups
 * on the next run cost far less than an unbounded cache would).
 */
export function createBlockTimestampLookup(
  rpcUrls: readonly string[],
): (blockNumber: bigint) => Promise<UnixSeconds> {
  const client = createPublicClient({ transport: fallback(rpcUrls.map((url) => http(url)), { retryCount: 0 }) });
  const cache = new Map<bigint, UnixSeconds>();

  return async (blockNumber) => {
    const cached = cache.get(blockNumber);
    if (cached !== undefined) return cached;
    const block = await client.getBlock({ blockNumber });
    const timestamp = Number(block.timestamp) as UnixSeconds;
    cache.set(blockNumber, timestamp);
    return timestamp;
  };
}

export function createOnchainEventSource(rpcUrls: readonly string[]): BlockchainEventSource {
  const client = createPublicClient({
    transport: fallback(rpcUrls.map((url) => http(url)), { retryCount: 0 }),
  });

  return {
    async getSafeHead(): Promise<bigint> {
      const latest = await client.getBlockNumber();
      return latest > REORG_SAFE_DEPTH ? latest - REORG_SAFE_DEPTH : 0n;
    },

    async getEvents(range: EventRange, addresses: readonly Address[]): Promise<readonly LogEvent[]> {
      const logs = await client.getLogs({
        address: [...addresses] as ViemAddress[],
        events: EVENT_ABI_ITEMS,
        fromBlock: range.fromBlock,
        toBlock: range.toBlock,
      });

      const out: LogEvent[] = [];
      for (const l of logs) {
        // One extra RPC round-trip per log to get the transaction sender
        // (needed by events that name no actor of their own, e.g.
        // `OfferCancelled` — `domain/indexer/plan.ts`). A batched
        // `getTransactionReceipt` pass would cut this down; not attempted
        // here (see docs/indexer.md KNOWN ISSUES).
        const tx = await client.getTransaction({ hash: l.transactionHash });
        out.push({
          address: l.address as Address,
          blockNumber: l.blockNumber,
          logIndex: l.logIndex,
          transactionHash: l.transactionHash,
          transactionSender: tx.from as Address,
          eventName: l.eventName,
          args: l.args as Record<string, unknown>,
        });
      }
      return out;
    },
  };
}
