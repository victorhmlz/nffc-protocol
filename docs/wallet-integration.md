# Wallet Integration (Self-Custody)

Wallet connect, network detection, and the transaction state machine — TASK-16
(`NFFC_Development_Plan.md` v3.2; `docs/spec/07-ux-map.md` §3;
`docs/spec/08-security-principles.md` A7). **Self-custody only**: the protocol
never holds a key or can move a user's NFFC on their behalf.

## Stack

[wagmi](https://wagmi.sh) 3 + [viem](https://viem.sh) 2 + `@tanstack/react-query` 5.
`src/app/providers.tsx` is the only new Client Component boundary at the root —
everything above it (fonts, `<head>` metadata) stays a Server Component
(`docs/conventions.md` §2: Client Components only for wallet/signing).

## Chain & connectors

- `src/lib/wallet/chain.ts` — the viem `Chain` wagmi targets, built from the
  fixed facts in `config/chain.ts` (`ROBINHOOD_CHAIN`, id 4663) plus public RPC
  URL(s) from `NEXT_PUBLIC_RPC_4663_URLS` (empty by default — connect/sign still
  work; a read through wagmi's public client throws only when attempted, the
  same "fail at use time" pattern as `infra/rpc/chain-reader.ts`).
- `src/lib/wallet/wagmi-config.ts` — `injected()` (any browser-extension EIP-1193
  wallet) always; `walletConnect({ projectId })` only when
  `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` is set, so a missing project id degrades
  gracefully instead of failing at startup.
- **No custodial connector is offered anywhere** — the connector list is fixed
  in `wagmi-config.ts`, not user- or server-configurable.

**Assumption, recorded here rather than left implicit:** there is no published
Robinhood Wallet SDK/connector to integrate against. It is treated as a generic
injected EVM wallet (`injected()` detects it like MetaMask, Rabby, etc.), which
matches the whitepaper's framing of it as a self-custody EVM wallet. If Robinhood
ships a dedicated connector later, swapping it in is a one-line change in
`wagmi-config.ts` with no consumer changes.

## Wrong-network detection

`src/lib/wallet/network-guard.ts`:

- `deriveNetworkGuardState(currentChainId, targetChainId)` — pure; `null`
  current chain (not connected) is never "wrong". Fully unit-tested.
- `useNetworkGuard()` — thin glue over `useAccount` / `useSwitchChain`.
- `NetworkBanner` (`src/components/wallet/network-banner.tsx`) renders nothing
  when not connected or already on Robinhood Chain; otherwise a `role="alert"`
  banner naming both chains with a one-click **Switch network** button
  (TASK-16 acceptance: "detects an incorrect network automatically and offers a
  switch to Robinhood Chain").

## Transaction state machine

`src/lib/wallet/transaction-state.ts` (TASK-03) fixed the vocabulary:

```
IDLE → AWAITING_WALLET → SIGNING → SUBMITTED → CONFIRMING → SUCCESS | FAILED | REJECTED
```

TASK-16 adds the transitions, `src/lib/wallet/transaction-flow.ts`:

- `transactionFlowReducer(state, event)` — a **total lookup-table reducer**.
  Every event names the exact state(s) it may fire from; a caller can only ever
  advance one step. Any other combination — including the literal acceptance
  example, `SIGNING` straight to `SUCCESS` — throws
  `SkippedTransactionStateError` instead of silently landing on the wrong state.
  Fully unit-tested (every legal path + every illegal one).
- `useTransactionFlow()` — thin glue driving the reducer from
  `useWriteContract` (`onMutate` → `REQUEST_WALLET` then `SIGN`; `onSuccess` →
  `SUBMIT`; `onError` → `REJECT` if the wallet declined, else `FAIL`) and
  `useWaitForTransactionReceipt` (fetching → `CONFIRM`; success → `SUCCEED`;
  error → `FAIL`).

wagmi does not distinguish "wallet popup opening" from "awaiting the user's
signature" as separate events, so `REQUEST_WALLET` and `SIGN` fire back to back
— both precede the user's actual approval, matching the two states' own
descriptions in `transaction-state.ts`.

## Testing without a real wallet

Per `docs/conventions.md` §4 ("inject a fake"), the wallet is faked with
wagmi's own [`mock` connector](https://wagmi.sh/react/api/connectors/mock) —
the officially supported way to exercise real `useAccount` / `useConnect` /
`useSwitchChain` hooks with no browser extension and no network call.
`tests/support/wagmi-test-config.tsx` builds a `WagmiProvider` +
`QueryClientProvider` test harness around it, configured with Robinhood Chain
plus one extra "wrong" chain so network-mismatch states are reachable.
`ConnectWalletButton` / `NetworkBanner` are tested against this harness;
`transactionFlowReducer` and `deriveNetworkGuardState` are tested directly, no
wagmi needed.

## Components

| Component | Renders |
|---|---|
| `ConnectWalletButton` | One button per configured connector when disconnected; truncated address + Disconnect when connected. |
| `NetworkBanner` | Nothing when disconnected or correct network; a `role="alert"` banner + Switch button otherwise. |

Both are demoed on `/style-guide` against the real app connectors (no mock
wallet outside tests, so connecting there needs a browser extension).

## Environment

`NEXT_PUBLIC_RPC_4663_URLS`, `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` — both
optional, both client-safe (`.env.example`). Read by `src/lib/wallet/env.ts`,
kept separate from the `server-only` `infra/env.ts` loader, which the browser
bundle cannot import.

## Downstream

| TASK | Uses this |
|---|---|
| 17 | the create wizard's fee/mint step drives `useTransactionFlow` |
| 18 | the mint flow — art (TASK-12) and mint-condition (TASK-13) generation happen at the right point relative to `SIGNING`/`SUBMITTED` |
| 19 | marketplace buy / list / offer actions reuse `useTransactionFlow` |
