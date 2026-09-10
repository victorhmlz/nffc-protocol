import { stringToHex } from "viem";
import { runWorker, type Worker } from "@workers/runtime";
import { getConfig } from "@infra/env";
import { getLogger } from "@infra/logging/logger";
import { ROBINHOOD_CHAIN } from "@config/chain";
import { loadProviderSyncConfig, type ProviderSyncConfigSpec } from "./config";
import { createOnchainClients } from "./onchain";
import { jsonFileTokenSource } from "./source";
import { runProviderSync } from "./sync";

export interface ProviderSyncWorkerSpec {
  /** Worker name, e.g. `"robinhood-sync"`. */
  readonly name: string;
  /** Short provider tag for logs, e.g. `"robinhood"`. */
  readonly providerName: string;
  /** The provider id string, e.g. `"ROBINHOOD"` — hashed to `bytes32`. */
  readonly providerId: string;
  readonly config: ProviderSyncConfigSpec;
}

/**
 * Build and run a provider sync worker. Both `robinhood-sync` and `crypto-sync`
 * are one call to this — the reconcile / apply logic is shared
 * (`docs/spec/05-adapter-architecture.md`: peers, one pattern).
 *
 * Not operational until the registries + the provider's adapter are deployed
 * (TASK-31); until then it logs "not configured" and exits.
 */
export async function runProviderSyncWorker(
  spec: ProviderSyncWorkerSpec,
): Promise<void> {
  const worker: Worker = {
    name: spec.name,
    async run(signal) {
      const log = getLogger();
      const cfg = loadProviderSyncConfig(spec.config);
      if (!cfg.configured) {
        log.warn(
          { component: spec.name, reason: cfg.reason },
          "not configured — skipping (deploy contracts + set the sync key)",
        );
        return;
      }

      const rpcUrl =
        getConfig().rpcByChainId[ROBINHOOD_CHAIN.chainId]?.endpoints[0];
      if (!rpcUrl) {
        log.error({ component: spec.name }, "no RPC endpoint for chain 4663");
        return;
      }

      const providerId = stringToHex(spec.providerId, { size: 32 });
      const clients = createOnchainClients(cfg, rpcUrl, providerId);
      const summary = await runProviderSync({
        providerName: spec.providerName,
        providerId,
        chainId: BigInt(ROBINHOOD_CHAIN.chainId),
        source: jsonFileTokenSource(cfg.tokensFile),
        readOnChain: clients.readOnChain,
        upsert: clients.upsert,
        deactivate: clients.deactivate,
        now: () => Date.now(),
        logger: log,
        signal,
      });
      log.info({ component: spec.name, ...summary }, "run finished");
    },
  };
  await runWorker(worker);
}
