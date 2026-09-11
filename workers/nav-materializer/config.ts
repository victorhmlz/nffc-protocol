import { type Address, isAddress } from "viem";

/**
 * Config this worker needs to run for real: the deployed
 * `RepresentationRegistry` address (`ChainlinkPriceOracle` reads it), plus
 * the already-validated RPC/database config from `getConfig()` (checked by
 * the caller). Kept out of `AppConfig` — this value exists only after
 * TASK-31 deploys the contract.
 */
export type NavMaterializerConfig =
  | { readonly configured: false; readonly reason: string }
  | { readonly configured: true; readonly representationRegistry: Address };

export function loadNavMaterializerConfig(
  env: Readonly<Record<string, string | undefined>> = process.env,
): NavMaterializerConfig {
  const registry = env.CONTRACT_REPRESENTATION_REGISTRY;
  if (!registry || !isAddress(registry)) {
    return { configured: false, reason: "missing/invalid CONTRACT_REPRESENTATION_REGISTRY" };
  }
  return { configured: true, representationRegistry: registry };
}
