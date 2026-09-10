import { type Address, type Hex, isAddress } from "viem";
import { z } from "zod";

/**
 * Config for one provider sync worker. Kept out of `AppConfig` — these values
 * exist only after the adapter is deployed (TASK-31). Until then the worker
 * logs that it is not configured and exits cleanly.
 */
export interface ProviderSyncConfigSpec {
  /** e.g. `"CONTRACT_ROBINHOOD_ADAPTER"`. */
  readonly adapterEnvVar: string;
  /** e.g. `"CONTRACT_REPRESENTATION_REGISTRY"` — shared across providers. */
  readonly registryEnvVar: string;
  /** e.g. `"ROBINHOOD_SYNC_PRIVATE_KEY"`. */
  readonly keyEnvVar: string;
  /** e.g. `"ROBINHOOD_TOKENS_FILE"`. */
  readonly tokensFileEnvVar: string;
  /** Default when `tokensFileEnvVar` is unset. */
  readonly tokensFileDefault: string;
}

export type ProviderSyncConfig =
  | { readonly configured: false; readonly reason: string }
  | {
      readonly configured: true;
      readonly representationRegistry: Address;
      readonly adapter: Address;
      readonly syncPrivateKey: Hex;
      readonly tokensFile: string;
    };

const addr = (v: unknown): v is Address =>
  typeof v === "string" && isAddress(v);
const privKey = (v: unknown): v is Hex =>
  typeof v === "string" && /^0x[0-9a-fA-F]{64}$/.test(v);

export function loadProviderSyncConfig(
  spec: ProviderSyncConfigSpec,
  env: Readonly<Record<string, string | undefined>> = process.env,
): ProviderSyncConfig {
  const registry = env[spec.registryEnvVar];
  const adapter = env[spec.adapterEnvVar];
  const key = env[spec.keyEnvVar];
  const tokensFile = z
    .string()
    .trim()
    .min(1)
    .default(spec.tokensFileDefault)
    .parse(env[spec.tokensFileEnvVar]);

  const missing: string[] = [];
  if (!addr(registry)) missing.push(spec.registryEnvVar);
  if (!addr(adapter)) missing.push(spec.adapterEnvVar);
  if (!privKey(key)) missing.push(spec.keyEnvVar);

  if (!addr(registry) || !addr(adapter) || !privKey(key)) {
    return {
      configured: false,
      reason: `missing/invalid ${missing.join(", ")}`,
    };
  }

  return {
    configured: true,
    representationRegistry: registry,
    adapter,
    syncPrivateKey: key,
    tokensFile,
  };
}
