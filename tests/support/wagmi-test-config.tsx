/**
 * A wagmi config wired to the `mock` connector — wagmi's own supported way to
 * exercise real hooks (`useAccount`, `useConnect`, `useSwitchChain`, …) without
 * a real wallet extension or network (`docs/conventions.md` §4: "inject a
 * fake"). Used by the `src/components/wallet/*.test.tsx` suites.
 */
import type { ReactNode } from "react";
import { defineChain, http } from "viem";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createConfig, WagmiProvider, type Config } from "wagmi";
import { mock } from "wagmi/connectors";
import { robinhoodChain } from "@/lib/wallet/chain";

// A well-known, EIP-55-checksummed test address (Hardhat/Anvil default account
// #0) — viem's mock connector validates the checksum, so this must be exact
// (verified with viem's own `getAddress`).
export const MOCK_ACCOUNT =
  "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266" as const;

/** A second configured chain, so "wrong network" is reachable in tests. */
export const wrongChain = defineChain({
  id: 1,
  name: "Test Wrong Chain",
  nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: [] } },
});

export function createTestWagmiConfig(
  options: { defaultConnected?: boolean; switchChainError?: boolean } = {},
): Config {
  return createConfig({
    chains: [robinhoodChain, wrongChain],
    connectors: [
      mock({
        accounts: [MOCK_ACCOUNT],
        features: {
          defaultConnected: options.defaultConnected ?? false,
          switchChainError: options.switchChainError ?? false,
        },
      }),
    ],
    transports: { [robinhoodChain.id]: http(), [wrongChain.id]: http() },
  });
}

/** Wraps `children` in real `WagmiProvider` + `QueryClientProvider` for RTL `render`. */
export function WagmiTestProviders({
  config,
  children,
}: {
  config: Config;
  children: ReactNode;
}) {
  const queryClient = new QueryClient();
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}
