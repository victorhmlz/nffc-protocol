/**
 * Shape of the runtime configuration. The loader (env parsing, validation,
 * per-environment resolution) is TASK-04; this file only fixes the contract so
 * other modules can depend on it now.
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
  readonly rpcByChainId: Readonly<Record<number, RpcConfig>>;
  readonly database: DatabaseConfig;
  readonly redis: RedisConfig;
}
