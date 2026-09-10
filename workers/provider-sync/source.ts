import { readFile } from "node:fs/promises";
import { type Address, isAddress } from "viem";
import { z } from "zod";
import type { ProviderToken } from "./types";

/**
 * Where a sync worker gets a provider's official active asset list.
 *
 * V1 ships a config-file source (seed / testnet). The production source — a
 * provider API or an on-chain registry — plugs in behind this same interface;
 * the reconciler and worker do not change.
 */
export interface ProviderTokenSource {
  readonly name: string;
  list(): Promise<readonly ProviderToken[]>;
}

const addressSchema = z.custom<Address>(
  (v) => typeof v === "string" && isAddress(v),
  "invalid EVM address",
);

const entrySchema = z.object({
  symbol: z.string().trim().min(1).max(16),
  name: z.string().trim().min(1),
  token: addressSchema,
  decimals: z.number().int().min(0).max(36),
  /** decimal string, `"1000000000000000000"` == 1.0 */
  multiplier: z.string().regex(/^\d+$/),
  oracle: z.object({
    feed: addressSchema,
    heartbeat: z.number().int().positive(),
    feedDecimals: z.number().int().min(0).max(36),
  }),
});

const listSchema = z.array(entrySchema);

function toToken(e: z.infer<typeof entrySchema>): ProviderToken {
  return {
    symbol: e.symbol,
    name: e.name,
    token: e.token,
    decimals: e.decimals,
    multiplier: BigInt(e.multiplier),
    oracle: e.oracle,
  };
}

/** Source from an already-parsed array (tests, or an in-memory config). */
export function fixedTokenSource(
  entries: readonly ProviderToken[],
  name = "fixed",
): ProviderTokenSource {
  return { name, list: async () => entries };
}

/** Source from a JSON file matching `config/<provider>/*.example.json`. */
export function jsonFileTokenSource(path: string): ProviderTokenSource {
  return {
    name: `json:${path}`,
    async list() {
      const raw = await readFile(path, "utf8");
      const parsed = listSchema.parse(JSON.parse(raw));
      return parsed.map(toToken);
    },
  };
}
