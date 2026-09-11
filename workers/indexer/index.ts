import { runWorker, type Worker } from "@workers/runtime";
import { getConfig } from "@infra/env";
import { getLogger } from "@infra/logging/logger";
import { ROBINHOOD_CHAIN } from "@config/chain";
import { loadIndexerConfig } from "./config";
import { createBlockTimestampLookup, createOnchainEventSource } from "./onchain";
import { runIndexerPass } from "./run";

/**
 * Blockchain indexer (TASK-24) — Transfer, Mint (+ composition), listing,
 * sale, and offer events into the mirror tables, idempotently. One pass per
 * invocation, same as `workers/provider-sync/` and
 * `workers/nav-materializer/` — an external scheduler (cron, a supervised
 * loop) re-invokes this repeatedly; the worker itself doesn't poll.
 *
 * Not operational until `NFFC.sol` and `Marketplace.sol` are deployed
 * (TASK-31) — logs why and exits cleanly, same pattern as every other
 * worker in this project. `run.ts`'s orchestration logic is complete and
 * fully unit-tested regardless.
 *
 * `createPostgresIndexerStore` is loaded with a dynamic `import()` below,
 * not a static one — `infra/indexer/postgres-indexer-store.ts` starts with
 * `import "server-only"`, which unconditionally throws outside Next's own
 * bundler (its package `exports` map only serves the safe no-op build under
 * the `react-server` condition, which only Next's compiler sets — confirmed
 * by reading `node_modules/server-only/package.json`). A static import would
 * crash this file immediately under `tsx`/`pnpm worker`, even in the
 * everyday "not configured" path every other worker exits cleanly from. See
 * KNOWN ISSUES in `docs/reports/TASK-24-REPORT.md` / `docs/OPEN_ISSUES.md` —
 * the same landmine sits under every `server-only`-tagged infra module
 * (`postgres-price-store.ts`, `postgres-nav-store.ts` included) and isn't
 * fixed here; it's a cross-cutting call for the Project Lead.
 */
const worker: Worker = {
  name: "indexer",
  async run(signal) {
    const log = getLogger();
    const cfg = loadIndexerConfig();
    if (!cfg.configured) {
      log.warn(
        { component: "indexer", reason: cfg.reason },
        "not configured — skipping (deploy NFFC.sol + Marketplace.sol, TASK-31)",
      );
      return;
    }

    const rpcUrls = getConfig().rpcByChainId[ROBINHOOD_CHAIN.chainId]?.endpoints;
    if (!rpcUrls || rpcUrls.length === 0) {
      log.error({ component: "indexer" }, "no RPC endpoint for chain 4663");
      return;
    }
    if (!getConfig().database) {
      log.error({ component: "indexer" }, "no DATABASE_URL configured");
      return;
    }

    const { createPostgresIndexerStore } = await import("@infra/indexer");

    const summary = await runIndexerPass({
      streamName: "indexer:main",
      addresses: [cfg.nffc, cfg.marketplace],
      genesisBlock: 0, // TASK-31's deployment block, once known
      reorgSafetyMarginBlocks: 5,
      maxBlockRange: 2000,
      eventSource: createOnchainEventSource(rpcUrls),
      store: createPostgresIndexerStore(),
      getBlockTimestamp: createBlockTimestampLookup(rpcUrls),
      logger: log,
      signal,
    });

    log.info({ component: "indexer", ...summary }, "run finished");
  },
};

await runWorker(worker);
