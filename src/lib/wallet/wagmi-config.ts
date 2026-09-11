/**
 * The wagmi config for the app — self-custody only (`docs/wallet-integration.md`).
 * `injected()` covers Robinhood Wallet and any other generic EIP-1193 browser
 * extension the whitepaper's "self-custody EVM wallet" framing includes; there
 * is no dedicated Robinhood Wallet SDK to integrate against, so it is treated
 * like any other injected wallet (assumption recorded in the TASK-16 report).
 * `walletConnect(...)` is added only when a project id is configured, so a
 * missing `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` degrades gracefully instead of
 * failing at startup. No custodial connector is offered anywhere.
 */
import { http } from "viem";
import { createConfig, injected } from "wagmi";
import { walletConnect } from "wagmi/connectors";
import { robinhoodChain } from "@/lib/wallet/chain";
import { getWalletPublicEnv } from "@/lib/wallet/env";

export function buildWagmiConfig(env = getWalletPublicEnv()) {
  return createConfig({
    chains: [robinhoodChain],
    connectors: [
      injected(),
      ...(env.walletConnectProjectId
        ? [
            walletConnect({
              projectId: env.walletConnectProjectId,
              showQrModal: true,
            }),
          ]
        : []),
    ],
    transports: {
      [robinhoodChain.id]: http(),
    },
  });
}

export const wagmiConfig = buildWagmiConfig();
