import { runProviderSyncWorker } from "../provider-sync";

/**
 * Native-crypto sync (BTC, ETH, …). Reconciles the verified wrapped/homolog
 * token list into the `CRYPTO_NATIVE` representations via `CryptoAdapter`.
 * A peer of `robinhood-sync` — identical logic, different provider id.
 * See `workers/provider-sync/`.
 */
await runProviderSyncWorker({
  name: "crypto-sync",
  providerName: "crypto",
  providerId: "CRYPTO_NATIVE",
  config: {
    registryEnvVar: "CONTRACT_REPRESENTATION_REGISTRY",
    adapterEnvVar: "CONTRACT_CRYPTO_ADAPTER",
    keyEnvVar: "CRYPTO_SYNC_PRIVATE_KEY",
    tokensFileEnvVar: "CRYPTO_TOKENS_FILE",
    tokensFileDefault: "config/crypto/native-tokens.json",
  },
});
