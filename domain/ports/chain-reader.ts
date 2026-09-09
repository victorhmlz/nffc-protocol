/**
 * Read-only view of a chain. Multi-provider RPC, failover, and caching are the
 * implementation's concern (TASK-04); the domain only needs these reads.
 */
import type { Address } from "@domain/shared/branded";
import type { ChainId } from "@domain/registry/types";

export interface ContractCall {
  readonly address: Address;
  /** Human-readable ABI signature, e.g. `"function ownerOf(uint256) view returns (address)"`. */
  readonly signature: string;
  readonly args: readonly unknown[];
}

export interface ChainReader {
  readonly chainId: ChainId;
  getBlockNumber(): Promise<bigint>;
  /**
   * Decoded return value of a `view`/`pure` call. The caller supplies the
   * expected type; decoding is the adapter's responsibility.
   */
  readContract<TResult>(call: ContractCall): Promise<TResult>;
}
