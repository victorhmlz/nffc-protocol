// @vitest-environment node
import { afterEach, describe, expect, it } from "vitest";
import { getLogger, resetLoggerCache } from "@infra/logging/logger";
import { resetConfigCache } from "@infra/env";

afterEach(() => {
  resetLoggerCache();
  resetConfigCache();
});

describe("getLogger", () => {
  it("returns the Logger interface and is cached", () => {
    const a = getLogger();
    const b = getLogger();
    expect(a).toBe(b);
    for (const m of ["debug", "info", "warn", "error", "child"] as const) {
      expect(typeof a[m]).toBe("function");
    }
  });

  it("child() returns a Logger and logging does not throw", () => {
    const child = getLogger().child({ component: "test" });
    expect(typeof child.info).toBe("function");
    expect(() => child.info({ k: 1 }, "hello")).not.toThrow();
  });
});
