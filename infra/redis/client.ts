import Redis from "ioredis";
import { getConfig } from "@infra/env";
import { getLogger } from "@infra/logging/logger";

export class RedisNotConfiguredError extends Error {
  override name = "RedisNotConfiguredError";
  constructor() {
    super("No REDIS_URL configured for this environment.");
  }
}

let client: Redis | undefined;

/**
 * Lazily-created Redis client (`lazyConnect` — no socket until first command).
 * Throws {@link RedisNotConfiguredError} if no redis is configured.
 */
export function getRedis(): Redis {
  if (client) return client;
  const cfg = getConfig().redis;
  if (!cfg) throw new RedisNotConfiguredError();

  client = new Redis(cfg.url, {
    lazyConnect: true,
    maxRetriesPerRequest: 2,
    enableOfflineQueue: false,
  });
  client.on("error", (err: Error) => {
    getLogger().error(
      { component: "redis", err: { message: err.message } },
      "redis client error",
    );
  });
  return client;
}

/** `true` if `PING` succeeds. Never throws. */
export async function pingRedis(): Promise<boolean> {
  try {
    const r = getRedis();
    if (r.status !== "ready") await r.connect();
    return (await r.ping()) === "PONG";
  } catch {
    return false;
  }
}

export async function closeRedis(): Promise<void> {
  if (!client) return;
  client.disconnect();
  client = undefined;
}
