import type { Address, Hex } from "viem";
import type { Logger } from "@infra/logging/logger";
import { reconcile } from "./reconcile";
import type {
  OnChainRepresentation,
  RobinhoodSyncSummary,
  RobinhoodToken,
} from "./types";
import type { RobinhoodTokenSource } from "./source";

export interface RobinhoodSyncDeps {
  readonly source: RobinhoodTokenSource;
  readonly chainId: bigint;
  /** Current `ROBINHOOD` representations on-chain. */
  readOnChain(): Promise<readonly OnChainRepresentation[]>;
  /** Register / refresh / re-activate one representation via the adapter. */
  upsert(token: RobinhoodToken): Promise<void>;
  /** Deactivate one representation via the adapter. */
  deactivate(entry: { representationId: Hex; token: Address }): Promise<void>;
  now(): number;
  readonly logger: Logger;
  /** Abort promptly once true (worker shutdown). */
  readonly signal?: AbortSignal;
}

/**
 * One reconciliation pass: pull the provider list, read on-chain state, diff,
 * apply. Idempotent — running it twice with the same inputs is a no-op the
 * second time. All I/O is injected so the logic is tested without a chain.
 */
export async function runRobinhoodSync(
  deps: RobinhoodSyncDeps,
): Promise<RobinhoodSyncSummary> {
  const log = deps.logger.child({
    component: "robinhood-sync",
    source: deps.source.name,
  });

  const [providerTokens, onChain] = await Promise.all([
    deps.source.list(),
    deps.readOnChain(),
  ]);

  const plan = reconcile(onChain, providerTokens, deps.chainId);
  log.info(
    {
      providerTokens: providerTokens.length,
      onChain: onChain.length,
      toUpsert: plan.toUpsert.length,
      toDeactivate: plan.toDeactivate.length,
      unchanged: plan.unchanged,
    },
    "reconciled",
  );

  let upserted = 0;
  for (const token of plan.toUpsert) {
    if (deps.signal?.aborted) break;
    await deps.upsert(token);
    upserted += 1;
  }

  let deactivated = 0;
  for (const entry of plan.toDeactivate) {
    if (deps.signal?.aborted) break;
    await deps.deactivate(entry);
    deactivated += 1;
  }

  const summary: RobinhoodSyncSummary = {
    upserted,
    deactivated,
    unchanged: plan.unchanged,
    at: deps.now(),
  };
  log.info({ ...summary }, "sync complete");
  return summary;
}
