import { type Address, type Hex, isAddress } from "viem";
import { z } from "zod";

/**
 * Worker-scoped configuration. Kept out of `AppConfig` — these values only exist
 * after the registries are deployed (TASK-31). Until then the worker logs that it
 * is not configured and exits cleanly.
 */
const addr = z.custom<Address>(
  (v) => typeof v === "string" && isAddress(v),
  "invalid EVM address",
);
const privKey = z.custom<Hex>(
  (v) => typeof v === "string" && /^0x[0-9a-fA-F]{64}$/.test(v),
  "invalid private key",
);

const schema = z.object({
  CONTRACT_REPRESENTATION_REGISTRY: addr.optional(),
  CONTRACT_ROBINHOOD_ADAPTER: addr.optional(),
  ROBINHOOD_SYNC_PRIVATE_KEY: privKey.optional(),
  ROBINHOOD_TOKENS_FILE: z
    .string()
    .trim()
    .min(1)
    .default("config/robinhood/stock-tokens.json"),
});

export type RobinhoodSyncConfig =
  | { readonly configured: false; readonly reason: string }
  | {
      readonly configured: true;
      readonly representationRegistry: Address;
      readonly robinhoodAdapter: Address;
      readonly syncPrivateKey: Hex;
      readonly tokensFile: string;
    };

export function loadRobinhoodSyncConfig(
  env: Readonly<Record<string, string | undefined>> = process.env,
): RobinhoodSyncConfig {
  const e = schema.parse(env);
  const missing: string[] = [];
  if (!e.CONTRACT_REPRESENTATION_REGISTRY)
    missing.push("CONTRACT_REPRESENTATION_REGISTRY");
  if (!e.CONTRACT_ROBINHOOD_ADAPTER) missing.push("CONTRACT_ROBINHOOD_ADAPTER");
  if (!e.ROBINHOOD_SYNC_PRIVATE_KEY) missing.push("ROBINHOOD_SYNC_PRIVATE_KEY");

  if (
    !e.CONTRACT_REPRESENTATION_REGISTRY ||
    !e.CONTRACT_ROBINHOOD_ADAPTER ||
    !e.ROBINHOOD_SYNC_PRIVATE_KEY
  ) {
    return { configured: false, reason: `missing ${missing.join(", ")}` };
  }

  return {
    configured: true,
    representationRegistry: e.CONTRACT_REPRESENTATION_REGISTRY,
    robinhoodAdapter: e.CONTRACT_ROBINHOOD_ADAPTER,
    syncPrivateKey: e.ROBINHOOD_SYNC_PRIVATE_KEY,
    tokensFile: e.ROBINHOOD_TOKENS_FILE,
  };
}
