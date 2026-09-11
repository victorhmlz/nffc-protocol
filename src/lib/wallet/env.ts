/**
 * Client-safe (`NEXT_PUBLIC_*`) wallet configuration. Deliberately separate from
 * `infra/env.ts`: that loader is `server-only` and never reaches the browser
 * bundle, so wagmi — which runs in the browser — cannot import it. Nothing read
 * here is a secret; RPC URLs and the WalletConnect project id are meant to be
 * public (`docs/wallet-integration.md`).
 */
export interface WalletPublicEnv {
  /** Public RPC endpoint(s) for Robinhood Chain (4663), first = primary. Empty
   *  when unset — wagmi still works for connect/sign; on-chain reads through
   *  the public client throw only when actually attempted. */
  readonly rpcUrls: readonly string[];
  /** WalletConnect Cloud project id. `undefined` omits that connector. */
  readonly walletConnectProjectId: string | undefined;
}

export function getWalletPublicEnv(
  env: Readonly<Record<string, string | undefined>> = process.env,
): WalletPublicEnv {
  const raw = env.NEXT_PUBLIC_RPC_4663_URLS?.trim();
  const rpcUrls = raw
    ? raw
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    : [];

  const projectId = env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID?.trim();

  return {
    rpcUrls,
    walletConnectProjectId:
      projectId && projectId.length > 0 ? projectId : undefined,
  };
}
