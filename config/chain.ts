/**
 * Known, fixed facts about the first network. Not secrets, not environment —
 * RPC endpoints and per-environment values are loaded in TASK-04.
 */
import type { ChainId } from "@domain/registry/types";

export interface ChainInfo {
  readonly chainId: ChainId;
  readonly name: string;
  readonly nativeGasSymbol: string;
  /** Rollup layer and its settlement parent, for reference. */
  readonly layer: "L2";
  readonly settlementParent: "arbitrum";
}

export const ROBINHOOD_CHAIN: ChainInfo = {
  chainId: 4663 as ChainId,
  name: "Robinhood Chain",
  nativeGasSymbol: "ETH",
  layer: "L2",
  settlementParent: "arbitrum",
};
