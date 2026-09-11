import { runWorker, type Worker } from "@workers/runtime";
import { getConfig } from "@infra/env";
import { getLogger } from "@infra/logging/logger";
import { ROBINHOOD_CHAIN } from "@config/chain";
import { loadNavMaterializerConfig } from "./config";

/**
 * Reference NAV materialization (TASK-23). Not operational until
 * `RepresentationRegistry` is deployed (TASK-31) **and** there is a real
 * source of which tokens to materialize for (the indexer, TASK-24) — until
 * then this logs why and exits cleanly, the same pattern
 * `workers/provider-sync/` already established. `materialize.ts`'s own logic
 * (fetch prices → persist → compute → persist) is complete and fully
 * unit-tested against injected fakes (`ChainlinkPriceOracle`,
 * `createPostgresPriceStore`, `createPostgresNavStore` are all ready to wire
 * in here); only the token source is missing, so this file doesn't
 * construct them yet — there is nothing to call them with.
 */
const worker: Worker = {
  name: "nav-materializer",
  async run() {
    const log = getLogger();
    const cfg = loadNavMaterializerConfig();
    if (!cfg.configured) {
      log.warn(
        { component: "nav-materializer", reason: cfg.reason },
        "not configured — skipping (deploy RepresentationRegistry, TASK-31)",
      );
      return;
    }

    const rpcUrl = getConfig().rpcByChainId[ROBINHOOD_CHAIN.chainId]?.endpoints[0];
    if (!rpcUrl) {
      log.error({ component: "nav-materializer" }, "no RPC endpoint for chain 4663");
      return;
    }
    if (!getConfig().database) {
      log.error({ component: "nav-materializer" }, "no DATABASE_URL configured");
      return;
    }

    log.warn(
      { component: "nav-materializer" },
      "no token source configured yet — the indexer (TASK-24) is what supplies which tokens to " +
        "materialize a Reference NAV for; skipping",
    );
  },
};

await runWorker(worker);
