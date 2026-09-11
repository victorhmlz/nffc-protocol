# TASK 16 REPORT

## STATUS

COMPLETED

`pnpm verify` (lint · typecheck · test · build) green locally — **34 files, 168 tests** (139 → +29).
`pnpm contracts:build` / `pnpm contracts:test` green — **128 Solidity tests**, unchanged (no `.sol`
touched). See PULL REQUEST for CI.

## OBJECTIVE

Wallet connection, network detection, and the transaction state machine — self-custody only, the
protocol never controls a user's keys or funds (`NFFC_Development_Plan.md` v3.2 TASK-16;
`docs/spec/08-security-principles.md` A7).

## CHANGES

### Dependencies

`wagmi@3.7.7`, `@tanstack/react-query@5.102.8` (wagmi's required peer for its hooks). `viem@^2.56.3`
was already present and satisfies wagmi's `viem: 2.x` peer range.

### Chain & wagmi config (`src/lib/wallet/`)

- **`env.ts`** — `getWalletPublicEnv()`, reading `NEXT_PUBLIC_RPC_4663_URLS` /
  `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`. Deliberately separate from the `server-only`
  `infra/env.ts` (TASK-04), which the browser bundle cannot import.
- **`chain.ts`** — the viem `Chain` wagmi targets, built from `config/chain.ts`'s `ROBINHOOD_CHAIN`
  facts (TASK-02) + the public RPC URL(s). Empty RPC list by default — connect/sign still work; a
  read through wagmi's public client throws only when attempted (same "fail at use time" pattern as
  `infra/rpc/chain-reader.ts`).
- **`wagmi-config.ts`** — `injected()` always; `walletConnect({ projectId })` only when a project id
  is configured, so a missing one degrades gracefully instead of crashing at startup. No custodial
  connector anywhere in the list.

**Assumption recorded, not left implicit:** there is no published Robinhood Wallet SDK/connector.
It is treated as a generic injected EVM wallet — matching the whitepaper's own framing of it as a
self-custody EVM wallet — via the standard `injected()` connector, same as MetaMask/Rabby/etc.

### Provider boundary

`src/app/providers.tsx` (new, `"use client"`) — `WagmiProvider` + `QueryClientProvider`, the only
new Client Component boundary; wired around `{children}` in `src/app/layout.tsx`, which otherwise
stays a Server Component (`docs/conventions.md` §2).

### Wrong-network detection (`src/lib/wallet/network-guard.ts`)

- **`deriveNetworkGuardState(currentChainId, targetChainId)`** — pure; `null` current chain (not
  connected) is never "wrong". Fully unit-tested.
- **`useNetworkGuard()`** — thin glue over `useAccount` / `useSwitchChain`.
- **`NetworkBanner`** (`src/components/wallet/network-banner.tsx`) — renders nothing unless
  connected to the wrong chain; then a `role="alert"` banner naming both chains + a **Switch
  network** button (TASK-16 acceptance).

### Transaction state machine (`src/lib/wallet/transaction-flow.ts`)

- **`transactionFlowReducer(state, event)`** — a total lookup-table reducer. Every event names the
  exact state(s) it may fire from (`REQUEST_WALLET`: idle→awaiting_wallet; `SIGN`:
  awaiting_wallet→signing; `SUBMIT`: signing→submitted; `CONFIRM`: submitted→confirming; `SUCCEED`:
  confirming→success; `REJECT`: {awaiting_wallet,signing}→rejected; `FAIL`: any non-terminal→failed;
  `RESET`: {idle,success,failed,rejected}→idle). Any other combination — including the literal
  acceptance example, SIGNING straight to SUCCESS — throws `SkippedTransactionStateError`. Fully
  unit-tested: the whole happy path one step at a time, every skip rejected, every side transition.
- **`useTransactionFlow()`** — thin glue: `useWriteContract`'s `onMutate` fires `REQUEST_WALLET`
  then `SIGN`; `onSuccess` fires `SUBMIT`; `onError` fires `REJECT` (wallet declined) or `FAIL`.
  `useWaitForTransactionReceipt` drives `CONFIRM` → `SUCCEED`/`FAIL`.

### Components (`src/components/wallet/`)

- **`ConnectWalletButton`** — one button per configured connector when disconnected; truncated
  address + Disconnect when connected.
- **`NetworkBanner`** — described above.

Both demoed on `/style-guide` (against the real app connectors — connecting there needs a browser
wallet extension, since no mock wallet exists outside tests).

### Testing infrastructure (`tests/support/wagmi-test-config.tsx`, new)

Per `docs/conventions.md` §4 ("inject a fake"), wallet tests use wagmi's own
[`mock` connector](https://wagmi.sh/react/api/connectors/mock) — the officially supported way to
exercise real `useAccount` / `useConnect` / `useSwitchChain` with no browser extension and no
network call. `WagmiTestProviders` wraps `WagmiProvider` + `QueryClientProvider`; the test config
adds a second "wrong" chain so network-mismatch states are reachable.

### Docs

`docs/wallet-integration.md` (new) — the full design: chain/connectors, the Robinhood-Wallet
assumption, network detection, the state machine + its transition table, the mock-connector testing
approach. `docs/design-system.md` — component row. `README.md` — status line, doc link, Stack row.
`.env.example` — `NEXT_PUBLIC_RPC_4663_URLS` / `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`, both optional
and client-safe.

## FILES CREATED

```
src/app/providers.tsx
src/lib/wallet/env.ts
src/lib/wallet/env.test.ts
src/lib/wallet/chain.ts
src/lib/wallet/wagmi-config.ts
src/lib/wallet/network-guard.ts
src/lib/wallet/network-guard.test.ts
src/lib/wallet/transaction-flow.ts
src/lib/wallet/transaction-flow.test.ts
src/components/wallet/connect-wallet-button.tsx
src/components/wallet/connect-wallet-button.test.tsx
src/components/wallet/network-banner.tsx
src/components/wallet/network-banner.test.tsx
tests/support/wagmi-test-config.tsx
docs/wallet-integration.md
docs/reports/TASK-16-REPORT.md
```

## FILES MODIFIED

```
package.json / pnpm-lock.yaml   + wagmi, @tanstack/react-query
src/app/layout.tsx              wraps {children} in <Providers>
src/app/style-guide/page.tsx    "Wallet (self-custody)" section
docs/design-system.md           ConnectWalletButton / NetworkBanner row
README.md                       status line, doc link, Stack row
.env.example                    NEXT_PUBLIC_RPC_4663_URLS / _WALLETCONNECT_PROJECT_ID
```

Branch is based on `main` (TASK-00…15) — see PULL REQUEST.

## TESTS

`pnpm test` → Vitest, **34 files, 168 tests** (29 new):

```
env.test.ts (5)                 RPC list split/trim/drop-empty; project id trim; blank = unset
network-guard.test.ts (4)       null current chain never "wrong"; correct/incorrect chain; ids
                                 pass through unchanged
transaction-flow.test.ts (13)   the full happy path one step at a time; the literal acceptance
                                 example (SIGNING -> SUCCESS) rejected, plus every other skip;
                                 REJECT only from awaiting_wallet/signing; FAIL from any
                                 non-terminal; RESET from idle/terminal
connect-wallet-button.test.tsx (4)  offers to connect; connects via the mock connector, shows
                                 truncated address + Disconnect; disconnects back; never offers a
                                 custodial connector
network-banner.test.tsx (3)     nothing when disconnected; nothing on the right chain; warns +
                                 switches on the wrong chain
```

`pnpm contracts:test` → **128 Solidity tests**, unchanged (TASK-16 adds no `.sol`).

## BUILD

`pnpm build` green — 7 routes, `/style-guide` still **statically prerendered** — the `Providers`
Client Component boundary at the root does not force the page dynamic.

## LINT / TYPECHECK

Clean. One fix along the way: `react-hooks/set-state-in-effect` flagged a direct `setState` inside
a `useEffect` in `transaction-flow.ts`; resolved by deriving the displayed error from
`receipt.error` at render time instead of mirroring it into a second `useState` from the effect.

## SECURITY

STEP 5 AUDIT (`docs/spec/08-security-principles.md`):

| Concern | This TASK |
|---|---|
| **A7 — self-custody only, no custodial wallet in the flow, backend never holds keys or can move a user's NFFC** (acceptance) | The connector list (`wagmi-config.ts`) is fixed in code to `injected()` + `walletConnect()` — no custodial option exists anywhere to add at runtime. `Providers`/`wagmi-config` run entirely client-side; no server code ever sees a private key. `connect-wallet-button.test.tsx` asserts no custodial/exchange text ever renders |
| **Automatic wrong-network detection + switch offer** (acceptance) | `NetworkBanner` renders only when connected to a chain ≠ 4663; `deriveNetworkGuardState` is pure and tested for all three cases (disconnected / correct / wrong) |
| **No state is skipped — no direct SIGNING to SUCCESS** (acceptance) | `transactionFlowReducer` is a total lookup-table reducer; the exact acceptance example is a dedicated test case (`transaction-flow.test.ts`) |
| No secrets committed | `NEXT_PUBLIC_*` vars are, by construction, not secrets (they ship in the client bundle); `.env.example` documents them as such |
| Provider isolation | `Providers` is the only Client Component boundary added at the root; it does not import `infra/` (server-only) or expose anything beyond wagmi/query context |

## PERFORMANCE

`transactionFlowReducer` / `deriveNetworkGuardState` are O(1) pure functions. No polling: wagmi's
`useWaitForTransactionReceipt` uses the query's own refetch strategy, not a hand-rolled loop.

## KNOWN ISSUES

1. **Not wired into a real write yet.** `useTransactionFlow`'s `request` is wagmi's raw
   `writeContract` — the actual contract call (mint, buy, list, …) is supplied by the caller in
   TASK-17/18/19; this TASK ships the state machine and its wagmi wiring.
2. **No public RPC configured by default.** `NEXT_PUBLIC_RPC_4663_URLS` is unset until a real
   endpoint exists for Robinhood Chain; wallet connect/sign work regardless, only on-chain reads
   through wagmi's public client need it.
3. **Robinhood Wallet = generic injected.** Recorded above and in `docs/wallet-integration.md`; no
   dedicated SDK exists to integrate against as of this TASK.
4. **`useTransactionFlow` itself is untested.** It is thin wagmi glue (consistent with the
   project's "pure core tested, thin glue untested" pattern — e.g. `workers/*/index.ts`); the
   reducer it drives is exhaustively tested instead.

## ACCEPTANCE CRITERIA

`NFFC_Development_Plan.md` v3.2 TASK-16:

| Criterion | Status | Evidence |
|---|---|---|
| Automatically detects the wrong network and offers a switch to Robinhood Chain (4663) | Met | `deriveNetworkGuardState` (tested) + `NetworkBanner` (tested against the mock connector, incl. the actual switch) |
| No state is skipped — no direct SIGNING to SUCCESS transition | Met | `transactionFlowReducer` total lookup table; dedicated test for exactly this case + every other skip |
| No custodial wallet (exchange or other) is part of the supported flow; the backend never stores private keys or can move a user's NFFC | Met | Fixed connector list (`injected` + optional `walletConnect`), no custodial entry; all wallet code is client-side; tested that no custodial/exchange copy ever renders |

## PULL REQUEST

Branch `task/TASK-16-wallet`, based on **`main`** (TASK-00…15).

**PR: <!-- filled in after push -->**

**Do not merge** — Project Lead reviews and authorizes.

## NEXT TASK

**TASK-17 — Creation Wizard (Frontend)** (`NFFC_Development_Plan.md` v3.2): the 7-step create
wizard — basic info, asset selection (Stock Tokens + native crypto on one surface), weights,
validation (I1–I8), art preview matching the exact post-mint output, fees shown before signing,
mint (simulate → sign → submit → confirm via TASK-16's state machine). Depends on TASK-03, TASK-07,
TASK-12, TASK-16. Blocked until the Project Lead merges this PR and authorizes TASK-17.
