/**
 * One Reference NAV materialization pass for a single token: fetch live
 * prices (TASK-22's `PriceOracle`), persist every observation (`PriceStore`,
 * for reproducibility — TASK-23 acceptance), compute the NAV
 * (`computeReferenceNav`), and persist the result (`NavStore`). All I/O is
 * injected so the logic is tested without a chain or a database
 * (`docs/conventions.md` §4) — mirrors `workers/provider-sync/sync.ts`'s
 * shape exactly.
 */
import { computeReferenceNav, type CompositionWeight } from "@domain/valuation/compute-reference-nav";
import type { TokenId } from "@domain/nffc/composition";
import type { UnixSeconds } from "@domain/shared/branded";
import type { NavStore } from "@domain/ports/nav-store";
import type { PriceOracle } from "@domain/ports/price-oracle";
import type { PriceStore } from "@domain/ports/price-store";
import type { Logger } from "@infra/logging/logger";

export interface NavMaterializerDeps {
  readonly tokenId: TokenId;
  /** The token's composition — a chain read (`NFFC.getComposition`) today;
   *  an indexed lookup once TASK-24 exists. Either way, injected. */
  getComposition(tokenId: TokenId): Promise<readonly CompositionWeight[]>;
  readonly priceOracle: PriceOracle;
  readonly priceStore: PriceStore;
  readonly navStore: NavStore;
  now(): UnixSeconds;
  readonly logger: Logger;
}

export interface NavMaterializationSummary {
  readonly tokenId: TokenId;
  readonly referenceNav: number;
  readonly degraded: boolean;
  readonly componentCount: number;
  readonly at: UnixSeconds;
}

export async function materializeReferenceNav(
  deps: NavMaterializerDeps,
): Promise<NavMaterializationSummary> {
  const log = deps.logger.child({ component: "nav-materializer", tokenId: deps.tokenId.toString() });

  const components = await deps.getComposition(deps.tokenId);
  const representationIds = components.map((c) => c.representationId);
  const prices = await deps.priceOracle.getPrices(representationIds);

  for (const price of prices.values()) {
    await deps.priceStore.record(price);
  }

  const now = deps.now();
  const nav = computeReferenceNav(deps.tokenId, components, prices, now);
  await deps.navStore.record(nav);

  log.info(
    { referenceNav: nav.value, degraded: nav.degraded, componentCount: components.length },
    "Reference NAV materialized",
  );

  return {
    tokenId: deps.tokenId,
    referenceNav: nav.value,
    degraded: nav.degraded,
    componentCount: components.length,
    at: now,
  };
}
