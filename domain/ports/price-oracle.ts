/**
 * Provider-agnostic price read. Chainlink is the only implementation in V1
 * (TASK-22), but the contract is written so a second oracle provider can be
 * added without changing consumers — `docs/spec/05-adapter-architecture.md` §6.
 */
import type { RepresentationId } from "@domain/registry/types";
import type { NormalizedPrice } from "@domain/pricing/types";

export interface PriceOracle {
  /** Latest normalized price for a representation, with source + timestamp. */
  getPrice(representationId: RepresentationId): Promise<NormalizedPrice>;
  getPrices(
    representationIds: readonly RepresentationId[],
  ): Promise<ReadonlyMap<RepresentationId, NormalizedPrice>>;
}
