/**
 * The viem `Chain` wagmi connects to — built from the fixed facts in
 * `config/chain.ts` plus the public RPC endpoint(s) (`src/lib/wallet/env.ts`).
 * Kept separate from `infra/rpc/chain-reader.ts`'s server-side `ChainReader`:
 * that one is `infra/`-only and reads via a `fallback` transport for
 * server-side data fetching; this one is what the *browser wallet* targets.
 */
import { defineChain } from "viem";
import { ROBINHOOD_CHAIN } from "@config/chain";
import { getWalletPublicEnv } from "@/lib/wallet/env";

export function buildRobinhoodChain(
  rpcUrls: readonly string[] = getWalletPublicEnv().rpcUrls,
) {
  return defineChain({
    id: ROBINHOOD_CHAIN.chainId,
    name: ROBINHOOD_CHAIN.name,
    nativeCurrency: {
      name: ROBINHOOD_CHAIN.nativeGasSymbol,
      symbol: ROBINHOOD_CHAIN.nativeGasSymbol,
      decimals: 18,
    },
    rpcUrls: {
      // Empty when NEXT_PUBLIC_RPC_4663_URLS is unset — wallet connect/sign still
      // work; a read through the public client throws only when attempted.
      default: { http: [...rpcUrls] },
    },
  });
}

export const robinhoodChain = buildRobinhoodChain();
