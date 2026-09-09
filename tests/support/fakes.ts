/**
 * In-memory fakes for the `domain/ports` interfaces and the infra `Logger`.
 * Import these in tests instead of touching a network, database, or wallet
 * (`docs/conventions.md` §4).
 */
import type { ChainReader, ContractCall } from "@domain/ports";
import type { ChainId } from "@domain/registry/types";
import type { UnixMillis } from "@domain/shared/branded";
import type { Logger } from "@infra/logging/logger";

export class FakeClock {
  constructor(private t: number) {}
  nowMillis(): UnixMillis {
    return this.t as UnixMillis;
  }
  advance(ms: number): void {
    this.t += ms;
  }
}

export interface FakeChainReaderOptions {
  chainId?: number;
  blockNumber?: bigint;
  /** Keyed by `${address}:${functionName}`. */
  reads?: Record<string, unknown>;
}

export function createFakeChainReader(
  opts: FakeChainReaderOptions = {},
): ChainReader & { calls: ContractCall[] } {
  const calls: ContractCall[] = [];
  const reads = opts.reads ?? {};
  return {
    calls,
    chainId: (opts.chainId ?? 4663) as ChainId,
    async getBlockNumber() {
      return opts.blockNumber ?? 1n;
    },
    async readContract<T>(call: ContractCall): Promise<T> {
      calls.push(call);
      const fn = call.signature.match(/function\s+(\w+)/)?.[1] ?? "";
      const key = `${call.address}:${fn}`;
      if (!(key in reads))
        throw new Error(`FakeChainReader: no canned read for ${key}`);
      return reads[key] as T;
    },
  };
}

export interface RecordedLog {
  level: "debug" | "info" | "warn" | "error";
  obj: Record<string, unknown>;
  msg: string | undefined;
}

export function createFakeLogger(): Logger & { records: RecordedLog[] } {
  const records: RecordedLog[] = [];
  const push =
    (level: RecordedLog["level"]) =>
    (obj: Record<string, unknown>, msg?: string) => {
      records.push({ level, obj, msg });
    };
  const logger: Logger & { records: RecordedLog[] } = {
    records,
    debug: push("debug"),
    info: push("info"),
    warn: push("warn"),
    error: push("error"),
    child: () => logger,
  };
  return logger;
}
