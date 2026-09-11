import { isAddress } from "viem";
import type { Address } from "@domain/shared/branded";

/**
 * The deployed contract addresses this worker watches. Both exist only
 * after TASK-31 — until then this worker logs why and exits, same as
 * `workers/provider-sync/config.ts` and `workers/nav-materializer/config.ts`.
 */
export type IndexerConfig =
  | { readonly configured: false; readonly reason: string }
  | { readonly configured: true; readonly nffc: Address; readonly marketplace: Address };

export function loadIndexerConfig(
  env: Readonly<Record<string, string | undefined>> = process.env,
): IndexerConfig {
  const nffc = env.CONTRACT_NFFC;
  const marketplace = env.CONTRACT_MARKETPLACE;
  const missing: string[] = [];
  if (!nffc || !isAddress(nffc)) missing.push("CONTRACT_NFFC");
  if (!marketplace || !isAddress(marketplace)) missing.push("CONTRACT_MARKETPLACE");

  if (missing.length > 0) {
    return { configured: false, reason: `missing/invalid ${missing.join(", ")}` };
  }
  return {
    configured: true,
    nffc: nffc as unknown as Address,
    marketplace: marketplace as unknown as Address,
  };
}
