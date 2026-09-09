import pino from "pino";
import { getConfig } from "@infra/env";

/**
 * Structured logging. The rest of the codebase depends on this {@link Logger}
 * interface, not on pino directly, so the implementation can change without a
 * ripple (observability wiring is TASK-39).
 */
export interface Logger {
  debug(obj: Record<string, unknown>, msg?: string): void;
  info(obj: Record<string, unknown>, msg?: string): void;
  warn(obj: Record<string, unknown>, msg?: string): void;
  error(obj: Record<string, unknown>, msg?: string): void;
  /** Child logger with fixed bindings (e.g. `{ worker: "indexer" }`). */
  child(bindings: Record<string, unknown>): Logger;
}

const REDACT = [
  "req.headers.authorization",
  "req.headers.cookie",
  "password",
  "secret",
  "token",
  "privateKey",
  "DATABASE_URL",
  "REDIS_URL",
  "*.password",
  "*.secret",
  "*.token",
  "*.privateKey",
];

function createPino(): pino.Logger {
  return pino({
    level: getConfig().logLevel,
    redact: { paths: REDACT, censor: "[redacted]" },
    // Plain JSON to stdout. For readable local output, pipe through
    // `pino-pretty` rather than configuring a transport (keeps the Next.js
    // bundler out of thread-stream territory).
    formatters: { level: (label) => ({ level: label }) },
  });
}

function wrap(p: pino.Logger): Logger {
  return {
    debug: (obj, msg) => p.debug(obj, msg),
    info: (obj, msg) => p.info(obj, msg),
    warn: (obj, msg) => p.warn(obj, msg),
    error: (obj, msg) => p.error(obj, msg),
    child: (bindings) => wrap(p.child(bindings)),
  };
}

let root: Logger | undefined;

export function getLogger(): Logger {
  root ??= wrap(createPino());
  return root;
}

/** Test hook. */
export function resetLoggerCache(): void {
  root = undefined;
}
