import { readFile } from "node:fs/promises";
import { type Address, isAddress } from "viem";
import { z } from "zod";
import type { RobinhoodToken } from "./types";

/**
 * Where the worker gets Robinhood's official active Stock Token list.
 *
 * V1 ships a config-file source (seed / testnet). The production source — a
 * Robinhood API or an on-chain Robinhood registry — plugs in behind this same
 * interface once its shape is known; the reconciler and worker do not change.
 */
export interface RobinhoodTokenSource {
  readonly name: string;
  list(): Promise<readonly RobinhoodToken[]>;
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

function toToken(e: z.infer<typeof entrySchema>): RobinhoodToken {
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
  entries: readonly RobinhoodToken[],
  name = "fixed",
): RobinhoodTokenSource {
  return { name, list: async () => entries };
}

/** Source from a JSON file matching `config/robinhood/stock-tokens.example.json`. */
export function jsonFileTokenSource(path: string): RobinhoodTokenSource {
  return {
    name: `json:${path}`,
    async list() {
      const raw = await readFile(path, "utf8");
      const parsed = listSchema.parse(JSON.parse(raw));
      return parsed.map(toToken);
    },
  };
}
