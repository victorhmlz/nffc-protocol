/**
 * Ordered, replayable stream of on-chain log events for the indexer (TASK-24).
 * Implementations must let the indexer resume from a stored cursor and reprocess
 * a range idempotently — see `docs/spec/09-data-model.md` §3.
 */
import type { Address } from "@domain/shared/branded";

export interface LogEvent {
  readonly address: Address;
  readonly blockNumber: bigint;
  readonly logIndex: number;
  readonly transactionHash: string;
  /** The transaction's sender — some events (e.g. `OfferCancelled`, which
   *  carries only an `offerId`) don't name an actor in their own args at
   *  all; this is the fallback every event has. */
  readonly transactionSender: Address;
  /** Decoded name, e.g. `"Sale"`, `"NFFCMinted"`. */
  readonly eventName: string;
  readonly args: Readonly<Record<string, unknown>>;
}

export interface EventRange {
  readonly fromBlock: bigint;
  readonly toBlock: bigint;
}

export interface BlockchainEventSource {
  /** Highest block considered final (below reorg depth). */
  getSafeHead(): Promise<bigint>;
  /** All matching events in `[fromBlock, toBlock]`, ascending, deterministic. */
  getEvents(
    range: EventRange,
    addresses: readonly Address[],
  ): Promise<readonly LogEvent[]>;
}
