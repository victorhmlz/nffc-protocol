// @vitest-environment node
import { describe, expect, it } from "vitest";
import { ConfigError, loadConfigFrom } from "@infra/env";

describe("loadConfigFrom", () => {
  it("defaults to development with no infra configured", () => {
    const cfg = loadConfigFrom({});
    expect(cfg.env).toBe("development");
    expect(cfg.logLevel).toBe("debug");
    expect(cfg.database).toBeNull();
    expect(cfg.redis).toBeNull();
    expect(cfg.rpcByChainId).toEqual({});
  });

  it("parses a comma-separated RPC list into ordered endpoints", () => {
    const cfg = loadConfigFrom({
      RPC_4663_URLS: "https://a.example , https://b.example",
    });
    expect(cfg.rpcByChainId[4663]?.endpoints).toEqual([
      "https://a.example",
      "https://b.example",
    ]);
  });

  it("reads database + redis when present", () => {
    const cfg = loadConfigFrom({
      DATABASE_URL: "postgres://u:p@h:5432/db",
      DATABASE_MAX_CONNECTIONS: "20",
      REDIS_URL: "redis://h:6379",
    });
    expect(cfg.database).toEqual({
      url: "postgres://u:p@h:5432/db",
      maxConnections: 20,
    });
    expect(cfg.redis).toEqual({ url: "redis://h:6379" });
  });

  it("requires database, redis, and RPC in production", () => {
    expect(() => loadConfigFrom({ APP_ENV: "production" })).toThrow(
      ConfigError,
    );
    try {
      loadConfigFrom({ APP_ENV: "production" });
    } catch (e) {
      expect((e as Error).message).toContain("DATABASE_URL");
      expect((e as Error).message).toContain("REDIS_URL");
      expect((e as Error).message).toContain("RPC_4663_URLS");
    }
  });

  it("rejects a malformed RPC URL", () => {
    expect(() => loadConfigFrom({ RPC_4663_URLS: "not-a-url" })).toThrow(
      ConfigError,
    );
  });

  it("rejects an unknown APP_ENV", () => {
    expect(() => loadConfigFrom({ APP_ENV: "prod" })).toThrow(ConfigError);
  });
});
