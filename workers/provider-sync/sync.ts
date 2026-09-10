import type { Address, Hex } from "viem";
import type { Logger } from "@infra/logging/logger";
import { reconcile } from "./reconcile";
import type {
  OnChainRepresentation,
  ProviderSyncSummary,
  ProviderToken,
} from "./types";
import type { ProviderTokenSource } from "./source";

export interface ProviderSyncDeps {
  /** For logs; also the sync's identity. */
  readonly providerName: string;
  /** `bytes32(providerId)` — matches the on-chain adapter's `providerId()`. */
  readonly providerId: Hex;
  readonly chainId: bigint;
  readonly source: ProviderTokenSource;
  /** Current representations for this provider on-chain. */
  readOnChain(): Promise<readonly OnChainRepresentation[]>;
  /** Register / refresh / re-activate one representation via the adapter. */
  upsert(token: ProviderToken): Promise<void>;
  /** Deactivate one representation via the adapter. */
  deactivate(entry: { representationId: Hex; token: Address }): Promise<void>;
  now(): number;
  readonly logger: Logger;
  readonly signal?: AbortSignal;
}

/**
 * One reconciliation pass: pull the provider list, read on-chain state, diff,
 * apply. Idempotent — a second run with the same inputs is a no-op. All I/O is
 * injected so the logic is tested without a chain. Shared by every provider
 * (`robinhood-sync`, `crypto-sync`, …).
 */
export async function runProviderSync(
  deps: ProviderSyncDeps,
): Promise<ProviderSyncSummary> {
  const log = deps.logger.child({
    component: "provider-sync",
    provider: deps.providerName,
    source: deps.source.name,
  });

  const [providerTokens, onChain] = await Promise.all([
    deps.source.list(),
    deps.readOnChain(),
  ]);

  const plan = reconcile(
    onChain,
    providerTokens,
    deps.providerId,
    deps.chainId,
  );
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

  const summary: ProviderSyncSummary = {
    upserted,
    deactivated,
    unchanged: plan.unchanged,
    at: deps.now(),
  };
  log.info({ ...summary }, "sync complete");
  return summary;
}
