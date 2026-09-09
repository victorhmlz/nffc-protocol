import { runWorker, type Worker } from "@workers/runtime";
import { getConfig } from "@infra/env";
import { getLogger } from "@infra/logging/logger";
import { ROBINHOOD_CHAIN } from "@config/chain";
import { loadRobinhoodSyncConfig } from "./config";
import { createOnchainClients } from "./onchain";
import { jsonFileTokenSource } from "./source";
import { runRobinhoodSync } from "./sync";

/**
 * Robinhood Stock Token sync worker. One reconciliation pass per run:
 * pull Robinhood's official active list → diff against the on-chain
 * `ROBINHOOD` representations → register new / refresh changed / re-activate
 * relisted / **deactivate delisted** → done. Scheduled externally.
 *
 * Not operational until the registries + adapter are deployed and
 * `ROBINHOOD_SYNC_PRIVATE_KEY` is set (TASK-31); until then it logs and exits.
 */
const worker: Worker = {
  name: "robinhood-sync",
  async run(signal) {
    const log = getLogger();
    const cfg = loadRobinhoodSyncConfig();
    if (!cfg.configured) {
      log.warn(
        { component: "robinhood-sync", reason: cfg.reason },
        "not configured — skipping (deploy contracts + set the sync key)",
      );
      return;
    }

    const rpc = getConfig().rpcByChainId[ROBINHOOD_CHAIN.chainId];
    const rpcUrl = rpc?.endpoints[0];
    if (!rpcUrl) {
      log.error(
        { component: "robinhood-sync" },
        "no RPC endpoint for chain 4663",
      );
      return;
    }

    const clients = createOnchainClients(cfg, rpcUrl);
    const summary = await runRobinhoodSync({
      source: jsonFileTokenSource(cfg.tokensFile),
      chainId: BigInt(ROBINHOOD_CHAIN.chainId),
      readOnChain: clients.readOnChain,
      upsert: clients.upsert,
      deactivate: clients.deactivate,
      now: () => Date.now(),
      logger: log,
      signal,
    });
    log.info({ component: "robinhood-sync", ...summary }, "run finished");
  },
};

await runWorker(worker);
