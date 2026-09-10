import { runProviderSyncWorker } from "../provider-sync";

/**
 * Robinhood Stock Token sync. Reconciles Robinhood's official active list into
 * the `ROBINHOOD` representations via `RobinhoodAdapter`. All logic is shared —
 * see `workers/provider-sync/`.
 */
await runProviderSyncWorker({
  name: "robinhood-sync",
  providerName: "robinhood",
  providerId: "ROBINHOOD",
  config: {
    registryEnvVar: "CONTRACT_REPRESENTATION_REGISTRY",
    adapterEnvVar: "CONTRACT_ROBINHOOD_ADAPTER",
    keyEnvVar: "ROBINHOOD_SYNC_PRIVATE_KEY",
    tokensFileEnvVar: "ROBINHOOD_TOKENS_FILE",
    tokensFileDefault: "config/robinhood/stock-tokens.json",
  },
});
