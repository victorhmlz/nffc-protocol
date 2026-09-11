/**
 * One indexer pass: read the stored cursor, fetch the events in
 * `[fromBlock, safeHead]` (capped at `maxBlockRange`), decode + plan +
 * apply each in order, then advance the cursor — **only if the whole batch
 * completed**. All I/O is injected so the logic is tested without a chain
 * or a database (`docs/conventions.md` §4). Mirrors
 * `workers/provider-sync/sync.ts`'s shape.
 *
 * **Idempotency** (TASK-24 acceptance: "reprocesar el mismo bloque dos
 * veces no duplica datos"): `IndexerStore.recordActivity`'s return value is
 * the single gate — a log already applied is skipped entirely (its
 * `MirrorWrite` isn't re-applied), so reprocessing a whole range is a
 * structural no-op, not something every individual upsert has to
 * separately guarantee.
 *
 * **Crash recovery** (TASK-24 acceptance: "recuperación automática tras
 * caída sin pérdida de eventos"): the cursor advances only after every
 * event in the batch has been applied. A crash mid-batch leaves the cursor
 * exactly where it was before this pass started — the next run reprocesses
 * the *entire* range from there, which is safe (idempotent) even though it
 * re-applies the events that already succeeded; nothing after the last
 * successful cursor is ever skipped.
 */
import { decodeEvent } from "@domain/indexer/decode";
import { planWrite, type EventContext } from "@domain/indexer/plan";
import type { BlockchainEventSource } from "@domain/ports/event-source";
import type { IndexerStore } from "@domain/ports/indexer-store";
import type { Address, UnixSeconds } from "@domain/shared/branded";
import type { Logger } from "@infra/logging/logger";

export interface IndexerRunDeps {
  readonly streamName: string;
  readonly addresses: readonly Address[];
  /** Where to start if this stream has never run — a contract's deployment
   *  block, not `0` (scanning a whole chain's history isn't the intent). */
  readonly genesisBlock: number;
  /** Extra blocks to re-verify below the last stored cursor on resume —
   *  defense in depth on top of `eventSource.getSafeHead()` already only
   *  reporting finalized blocks; harmless overlap thanks to idempotency. */
  readonly reorgSafetyMarginBlocks: number;
  /** Caps how many blocks one pass fetches at once — bounds a single
   *  `getEvents` call on a stream that's far behind. */
  readonly maxBlockRange: number;
  readonly eventSource: BlockchainEventSource;
  readonly store: IndexerStore;
  getBlockTimestamp(blockNumber: bigint): Promise<UnixSeconds>;
  readonly logger: Logger;
  readonly signal?: AbortSignal;
}

export interface IndexerRunSummary {
  readonly fromBlock: number;
  readonly toBlock: number;
  readonly eventsSeen: number;
  readonly eventsApplied: number;
  readonly duplicatesSkipped: number;
  readonly aborted: boolean;
}

export async function runIndexerPass(deps: IndexerRunDeps): Promise<IndexerRunSummary> {
  const log = deps.logger.child({ component: "indexer", stream: deps.streamName });

  const cursor = await deps.store.getCursor(deps.streamName);
  const safeHead = await deps.eventSource.getSafeHead();
  const fromBlock = cursor === null ? deps.genesisBlock : Math.max(0, cursor - deps.reorgSafetyMarginBlocks);
  const toBlock = Math.min(Number(safeHead), fromBlock + deps.maxBlockRange);

  if (fromBlock > toBlock) {
    log.info({ fromBlock, safeHead: Number(safeHead) }, "already caught up to the safe head");
    return { fromBlock, toBlock: fromBlock, eventsSeen: 0, eventsApplied: 0, duplicatesSkipped: 0, aborted: false };
  }

  const events = await deps.eventSource.getEvents(
    { fromBlock: BigInt(fromBlock), toBlock: BigInt(toBlock) },
    deps.addresses,
  );

  let eventsApplied = 0;
  let duplicatesSkipped = 0;
  let aborted = false;

  for (const rawEvent of events) {
    if (deps.signal?.aborted) {
      aborted = true;
      break;
    }

    const decoded = decodeEvent(rawEvent);
    if (!decoded) continue;

    const ctx: EventContext = {
      blockNumber: Number(rawEvent.blockNumber),
      logIndex: rawEvent.logIndex,
      txHash: rawEvent.transactionHash,
      blockTimestamp: await deps.getBlockTimestamp(rawEvent.blockNumber),
      transactionSender: rawEvent.transactionSender,
    };

    const { activity, mirror } = planWrite(decoded, ctx);

    if (activity) {
      const isNew = await deps.store.recordActivity(activity);
      if (isNew) {
        if (mirror) await deps.store.applyMirrorWrite(mirror);
        eventsApplied += 1;
      } else {
        duplicatesSkipped += 1;
      }
    } else if (mirror) {
      // No activity-table gate for this log (e.g. NFFC_COMPOSITION_RECORDED)
      // — its mirror write is a full replace-by-key, idempotent on its own
      // merits, so it's applied unconditionally.
      await deps.store.applyMirrorWrite(mirror);
      eventsApplied += 1;
    }
    // Both null (e.g. the mint's own zero-address TRANSFER): genuinely
    // nothing to do for this log — neither applied nor a duplicate.
  }

  if (!aborted) {
    await deps.store.advanceCursor(deps.streamName, toBlock, "OK");
  }

  log.info(
    { fromBlock, toBlock, eventsSeen: events.length, eventsApplied, duplicatesSkipped, aborted },
    aborted ? "pass aborted — cursor not advanced, will retry the same range" : "pass complete",
  );

  return { fromBlock, toBlock, eventsSeen: events.length, eventsApplied, duplicatesSkipped, aborted };
}
