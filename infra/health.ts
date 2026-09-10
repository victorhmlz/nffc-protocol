import { getConfig } from "@infra/env";
import { pingDb } from "@infra/db/pool";
import { pingRedis } from "@infra/redis/client";

export type DependencyStatus = "ok" | "down" | "not_configured";

export interface HealthReport {
  status: "ok" | "degraded";
  env: string;
  checks: {
    database: DependencyStatus;
    redis: DependencyStatus;
    rpc: DependencyStatus;
  };
}

interface HealthDeps {
  pingDb: () => Promise<boolean>;
  pingRedis: () => Promise<boolean>;
}

/**
 * Readiness snapshot. Each dependency is probed independently; a probe never
 * throws. `not_configured` is not a failure (dev/test may run without a
 * database), so `status` is `degraded` only when something configured is down.
 */
export async function checkHealth(
  deps: HealthDeps = { pingDb, pingRedis },
): Promise<HealthReport> {
  const cfg = getConfig();

  const database: DependencyStatus = !cfg.database
    ? "not_configured"
    : (await deps.pingDb())
      ? "ok"
      : "down";

  const redis: DependencyStatus = !cfg.redis
    ? "not_configured"
    : (await deps.pingRedis())
      ? "ok"
      : "down";

  const rpc: DependencyStatus =
    Object.keys(cfg.rpcByChainId).length > 0 ? "ok" : "not_configured";

  const anyDown = [database, redis, rpc].includes("down");

  return {
    status: anyDown ? "degraded" : "ok",
    env: cfg.env,
    checks: { database, redis, rpc },
  };
}
