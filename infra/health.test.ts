// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { checkHealth } from "@infra/health";
import { resetConfigCache } from "@infra/env";

const ORIGINAL = { ...process.env };

function setEnv(env: Record<string, string | undefined>): void {
  process.env = { ...ORIGINAL, ...env };
  resetConfigCache();
}

beforeEach(() => resetConfigCache());
afterEach(() => {
  process.env = { ...ORIGINAL };
  resetConfigCache();
});

describe("checkHealth", () => {
  it("reports not_configured deps as ok overall (dev without infra)", async () => {
    setEnv({
      APP_ENV: "development",
      DATABASE_URL: undefined,
      REDIS_URL: undefined,
      RPC_4663_URLS: undefined,
    });
    const report = await checkHealth({
      pingDb: async () => false,
      pingRedis: async () => false,
    });
    expect(report.status).toBe("ok");
    expect(report.checks).toEqual({
      database: "not_configured",
      redis: "not_configured",
      rpc: "not_configured",
    });
  });

  it("is degraded when a configured dependency is down", async () => {
    setEnv({
      APP_ENV: "development",
      DATABASE_URL: "postgres://u:p@h:5432/db",
      REDIS_URL: "redis://h:6379",
      RPC_4663_URLS: "https://a.example",
    });
    const report = await checkHealth({
      pingDb: async () => true,
      pingRedis: async () => false,
    });
    expect(report.status).toBe("degraded");
    expect(report.checks).toEqual({
      database: "ok",
      redis: "down",
      rpc: "ok",
    });
  });
});
