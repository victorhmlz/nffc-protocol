/**
 * Shape of the runtime configuration. The loader — env parsing, validation,
 * per-environment resolution — is `infra/env.ts` (TASK-04).
 */
export type AppEnv = "development" | "test" | "staging" | "production";

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface RpcConfig {
  /** One or more endpoints for a chain; the first is primary, rest are failover. */
  readonly endpoints: readonly string[];
}

export interface DatabaseConfig {
  readonly url: string;
  readonly maxConnections: number;
}

export interface RedisConfig {
  readonly url: string;
}

export interface AppConfig {
  readonly env: AppEnv;
  readonly logLevel: LogLevel;
  /** Per-chain RPC endpoints. May be empty in dev/test; a `ChainReader` for a
      chain with no endpoints throws when created. */
  readonly rpcByChainId: Readonly<Record<number, RpcConfig>>;
  /** `null` when no `DATABASE_URL` is set (allowed in dev/test, not in
      staging/production). */
  readonly database: DatabaseConfig | null;
  /** `null` when no `REDIS_URL` is set (same rule as `database`). */
  readonly redis: RedisConfig | null;
}
