import { describe, expect, it } from "vitest";
import type { Address, UnixSeconds } from "@domain/shared/branded";
import type { LogEvent } from "@domain/ports/event-source";
import { runIndexerPass, type IndexerRunDeps } from "./run";
import { createFakeEventSource, createFakeLogger, createInMemoryIndexerStore } from "../../tests/support/fakes";

const NFFC = "0x1111111111111111111111111111111111aaaa" as Address;
const SENDER = "0x2222222222222222222222222222222222bbbb" as Address;

function mintLog(tokenId: bigint, block: bigint, logIndex: number): LogEvent {
  return {
    address: NFFC,
    blockNumber: block,
    logIndex,
    transactionHash: `0xtx${block}-${logIndex}`,
    transactionSender: SENDER,
    eventName: "NFFCMinted",
    args: { tokenId, collectionId: 1n, creator: SENDER, compositionHash: "0xhash", componentCount: 1 },
  };
}

function transferLog(tokenId: bigint, from: string, to: string, block: bigint, logIndex: number): LogEvent {
  return {
    address: NFFC,
    blockNumber: block,
    logIndex,
    transactionHash: `0xtx${block}-${logIndex}`,
    transactionSender: SENDER,
    eventName: "Transfer",
    args: { from, to, tokenId },
  };
}

function baseDeps(overrides: Partial<IndexerRunDeps> = {}): IndexerRunDeps {
  return {
    streamName: "indexer:main",
    addresses: [NFFC],
    genesisBlock: 0,
    reorgSafetyMarginBlocks: 0,
    maxBlockRange: 1000,
    eventSource: createFakeEventSource({ safeHead: 100n, events: [] }),
    store: createInMemoryIndexerStore(),
    getBlockTimestamp: async () => 1_800_000_000 as UnixSeconds,
    logger: createFakeLogger(),
    ...overrides,
  };
}

describe("runIndexerPass — happy path", () => {
  it("decodes, plans, and applies every recognized event, then advances the cursor", async () => {
    const store = createInMemoryIndexerStore();
    const eventSource = createFakeEventSource({
      safeHead: 100n,
      events: [mintLog(1n, 10n, 0), transferLog(1n, "0x0000000000000000000000000000000000000000", SENDER, 10n, 2)],
    });

    const summary = await runIndexerPass(baseDeps({ store, eventSource }));

    expect(summary.eventsApplied).toBe(1); // the zero-address TRANSFER plans to nothing (see plan.ts)
    expect(summary.duplicatesSkipped).toBe(0);
    expect(summary.aborted).toBe(false);
    expect(store.activity).toHaveLength(1);
    expect(store.mirrorWrites).toEqual([expect.objectContaining({ kind: "NFFC_MINT", tokenId: 1n })]);
    expect(await store.getCursor("indexer:main")).toBe(summary.toBlock);
  });

  it("skips an unrecognized event name without erroring", async () => {
    const store = createInMemoryIndexerStore();
    const eventSource = createFakeEventSource({
      safeHead: 100n,
      events: [
        {
          address: NFFC,
          blockNumber: 10n,
          logIndex: 0,
          transactionHash: "0xtx",
          transactionSender: SENDER,
          eventName: "Approval",
          args: {},
        },
      ],
    });

    const summary = await runIndexerPass(baseDeps({ store, eventSource }));
    expect(summary.eventsApplied).toBe(0);
    expect(store.mirrorWrites).toHaveLength(0);
  });

  it("resumes from the stored cursor (minus the reorg safety margin) rather than the genesis block", async () => {
    const store = createInMemoryIndexerStore();
    await store.advanceCursor("indexer:main", 50, "OK");
    const eventSource = createFakeEventSource({ safeHead: 100n, events: [] });

    const summary = await runIndexerPass(baseDeps({ store, eventSource, genesisBlock: 0, reorgSafetyMarginBlocks: 5 }));
    expect(summary.fromBlock).toBe(45);
  });
});

describe("runIndexerPass — idempotency (acceptance: reprocessing a block never duplicates data)", () => {
  it("running the exact same range twice does not duplicate the mirror state", async () => {
    const store = createInMemoryIndexerStore();
    const eventSource = createFakeEventSource({ safeHead: 100n, events: [mintLog(1n, 10n, 0)] });

    const first = await runIndexerPass(baseDeps({ store, eventSource }));
    expect(first.eventsApplied).toBe(1);

    // Re-run over the same already-processed range (simulating a
    // reprocessed block, e.g. after a reorg-safety-margin overlap).
    const secondEventSource = createFakeEventSource({ safeHead: 100n, events: [mintLog(1n, 10n, 0)] });
    const second = await runIndexerPass(
      // A large enough margin to bring block 10 back into range from the
      // cursor the first pass advanced to (100) — the realistic case this
      // guards: the reorg-safety overlap window reprocessing an already-
      // finalized block.
      baseDeps({ store, eventSource: secondEventSource, reorgSafetyMarginBlocks: 95 }),
    );

    expect(second.duplicatesSkipped).toBe(1);
    expect(second.eventsApplied).toBe(0);
    expect(store.activity).toHaveLength(1); // still just the one activity row
    expect(store.mirrorWrites).toHaveLength(1); // the mirror write was never re-applied
  });
});

describe("runIndexerPass — crash recovery (acceptance: no lost events after a crash)", () => {
  it("does not advance the cursor when the pass is aborted mid-batch, so nothing after it is skipped on retry", async () => {
    const store = createInMemoryIndexerStore();
    const controller = new AbortController();
    const events = [mintLog(1n, 10n, 0), mintLog(2n, 11n, 0), mintLog(3n, 12n, 0)];

    // Abort partway through processing — simulates the process dying mid-pass.
    let processed = 0;
    const abortingEventSource = createFakeEventSource({ safeHead: 100n, events });
    const crashed = await runIndexerPass(
      baseDeps({
        store,
        eventSource: abortingEventSource,
        signal: controller.signal,
        getBlockTimestamp: async () => {
          processed += 1;
          if (processed === 2) controller.abort();
          return 1_800_000_000 as UnixSeconds;
        },
      }),
    );

    expect(crashed.aborted).toBe(true);
    expect(await store.getCursor("indexer:main")).toBeNull(); // cursor never advanced
    expect(store.activity.length).toBeLessThan(3); // the batch didn't fully complete

    // Retry with a fresh (non-aborted) run over the same range.
    const recovered = await runIndexerPass(baseDeps({ store, eventSource: createFakeEventSource({ safeHead: 100n, events }) }));

    expect(recovered.aborted).toBe(false);
    expect(store.activity).toHaveLength(3); // every event ended up applied — none lost
    expect(new Set(store.mirrorWrites.map((w) => (w as { tokenId: bigint }).tokenId))).toEqual(new Set([1n, 2n, 3n]));
  });
});
