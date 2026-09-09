import { z } from "zod";
import type { AppConfig, AppEnv, RpcConfig } from "@config/types";
import { ROBINHOOD_CHAIN } from "@config/chain";

/**
 * Parse, validate, and resolve `process.env` into a typed {@link AppConfig}.
 *
 * - `APP_ENV` selects the environment. `staging`/`production` require a database
 *   URL, a redis URL, and at least one RPC endpoint for Robinhood Chain;
 *   `development`/`test` tolerate their absence (the relevant client throws only
 *   when actually used).
 * - RPC endpoints are given per chain as a comma-separated list, e.g.
 *   `RPC_4663_URLS=https://a.example,https://b.example` — first is primary, the
 *   rest are failover.
 * - Never returns secrets to the client — this module is `server-only`.
 */

// The env var name is `RPC_<chainId>_URLS`; for Robinhood Chain that is 4663
// (see ROBINHOOD_CHAIN.chainId, a fixed fact).
const RPC_URLS_KEY = "RPC_4663_URLS";

const csvUrls = z
  .string()
  .trim()
  .transform((s) =>
    s
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean),
  )
  .pipe(z.array(z.url()).min(1));

const schema = z.object({
  APP_ENV: z
    .enum(["development", "test", "staging", "production"])
    .default("development"),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).optional(),
  DATABASE_URL: z.string().trim().min(1).optional(),
  DATABASE_MAX_CONNECTIONS: z.coerce.number().int().positive().default(10),
  REDIS_URL: z.string().trim().min(1).optional(),
  [RPC_URLS_KEY]: csvUrls.optional(),
});

export class ConfigError extends Error {
  override name = "ConfigError";
}

function defaultLogLevel(env: AppEnv): AppConfig["logLevel"] {
  if (env === "production" || env === "staging") return "info";
  if (env === "test") return "warn";
  return "debug";
}

type RawEnv = Readonly<Record<string, string | undefined>>;

function build(env: RawEnv): AppConfig {
  const parsed = schema.safeParse(env);
  if (!parsed.success) {
    throw new ConfigError(
      `Invalid environment:\n${z.prettifyError(parsed.error)}`,
    );
  }
  const e = parsed.data;
  const appEnv = e.APP_ENV;
  const strict = appEnv === "staging" || appEnv === "production";

  const rpcEndpoints = e[RPC_URLS_KEY];
  const rpcByChainId: Record<number, RpcConfig> = {};
  if (rpcEndpoints) {
    rpcByChainId[ROBINHOOD_CHAIN.chainId] = { endpoints: rpcEndpoints };
  }

  const missing: string[] = [];
  if (strict && !e.DATABASE_URL) missing.push("DATABASE_URL");
  if (strict && !e.REDIS_URL) missing.push("REDIS_URL");
  if (strict && !rpcEndpoints) missing.push(RPC_URLS_KEY);
  if (missing.length > 0) {
    throw new ConfigError(
      `Missing required environment for APP_ENV=${appEnv}: ${missing.join(", ")}`,
    );
  }

  return {
    env: appEnv,
    logLevel: e.LOG_LEVEL ?? defaultLogLevel(appEnv),
    rpcByChainId,
    database: e.DATABASE_URL
      ? { url: e.DATABASE_URL, maxConnections: e.DATABASE_MAX_CONNECTIONS }
      : null,
    redis: e.REDIS_URL ? { url: e.REDIS_URL } : null,
  };
}

let cached: AppConfig | undefined;

/** Cached, validated config. Throws {@link ConfigError} on invalid env. */
export function getConfig(): AppConfig {
  cached ??= build(process.env);
  return cached;
}

/** Build a config from an explicit env map, no caching. For tests. */
export function loadConfigFrom(env: RawEnv): AppConfig {
  return build(env);
}

/** Test hook — drop the cached config. */
export function resetConfigCache(): void {
  cached = undefined;
}
