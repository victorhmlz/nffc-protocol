# TASK 07 REPORT

## STATUS

COMPLETED

JS/TS gate `pnpm verify` (lint · typecheck · test · build) green locally. Contracts verified by CI
(Hardhat 3 needs Node ≥ 22.13; local box is 22.8). Both CI jobs on PR #8 pass — `verify` and
`contracts` (`hardhat compile` + **55 Solidity tests**). See PULL REQUEST.

## OBJECTIVE

The second Provider/Network Adapter, available from V1: native crypto (BTC, ETH via Chainlink,
verified WBTC/WETH-homolog addresses), **reusing the same registry and adapter interface as
Robinhood with no change to the NFFC core** (`NFFC_Development_Plan.md` v3.2 TASK-07;
`docs/spec/05-adapter-architecture.md`).

## CHANGES

### On-chain

- **`contracts/interfaces/IProviderAdapter.sol`** — promoted to the *full* shared interface:
  `SyncEntry` struct, `RepresentationSynced` / `RepresentationDeactivated` events, `ZeroAddress`
  error, and all five methods (`providerId`, `assetClass`, `syncUpsert`, `syncDeactivate`,
  `syncDeactivateByToken`). Both adapters implement it identically.
- **`contracts/ProviderAdapterBase.sol`** (new, abstract) — **all** the sync logic: `SYNC_ROLE`,
  immutables (`assetRegistry`, `representationRegistry`, `chainId`), and `syncUpsert` /
  `syncDeactivate` / `syncDeactivateByToken`. A concrete adapter supplies only three constants via
  `_providerId()` / `_assetClass()` / `_tokenStandard()`. "Peers, same interface, no hierarchy" is
  now realised as **one implementation**.
- **`contracts/RobinhoodAdapter.sol`** — slimmed to `is ProviderAdapterBase` + `ROBINHOOD` /
  `EQUITY` / `ERC20`. No behaviour change; `RobinhoodAdapter.t.sol` updated to reference
  `IProviderAdapter.SyncEntry` / `IProviderAdapter.ZeroAddress`.
- **`contracts/CryptoAdapter.sol`** (new) — `is ProviderAdapterBase` + `CRYPTO_NATIVE` / `CRYPTO` /
  `ERC20`. **`RepresentationRegistry` is unchanged** (TASK-07 acceptance).
- **`contracts/CryptoAdapter.t.sol`** (8) — identity constants; crypto asset + representation
  created; WBTC 8-decimals passthrough; declaring the wrong decimals reverts via the registry's
  verification; deactivate → re-upsert re-activates; non-`SYNC_ROLE` reverts; zero-admin constructor
  reverts; and **`test_bothAdaptersShareOneRegistry`** — a Robinhood representation and a crypto
  representation registered through their two adapters into one `RepresentationRegistry`, coexisting
  with distinct `providerId`s and their own `getRepresentationsByProvider` lists.

### Off-chain

- **`workers/provider-sync/`** (extracted from TASK-06's `robinhood-sync/`) — the shared engine:
  - `reconcile.ts` — generic `computeRepresentationId(providerId, chainId, token)` +
    `reconcile(onChain, providerTokens, providerId, chainId)` (unchanged logic: new → upsert,
    inactive-but-listed → re-activate, oracle drift → refresh, active-but-delisted → deactivate).
  - `sync.ts` — `runProviderSync(deps)` (deps now carry `providerName` / `providerId`).
  - `source.ts` — `ProviderTokenSource` (was `RobinhoodTokenSource`).
  - `onchain.ts` — `createOnchainClients(cfg, rpcUrl, providerId)`; the `ADAPTER_ABI` is one shape
    for every provider (they share `IProviderAdapter`).
  - `config.ts` — `loadProviderSyncConfig(spec, env)` — env-var names are parameters.
  - `index.ts` — `runProviderSyncWorker(spec)`; both providers are one call to it.
- **`workers/robinhood-sync/index.ts`** — reduced to a spec (`ROBINHOOD`, `CONTRACT_ROBINHOOD_ADAPTER`,
  `ROBINHOOD_SYNC_PRIVATE_KEY`, `ROBINHOOD_TOKENS_FILE`).
- **`workers/crypto-sync/index.ts`** (new) — the same, with `CRYPTO_NATIVE` /
  `CONTRACT_CRYPTO_ADAPTER` / `CRYPTO_SYNC_PRIVATE_KEY` / `CRYPTO_TOKENS_FILE`.
- Tests moved to `workers/provider-sync/{reconcile,sync}.test.ts` and generalised (11).
- **`config/crypto/native-tokens.example.json`** + README (git-ignored real file). `.env.example`
  gains the `CRYPTO_*` vars; `.gitignore` the real crypto token file.

## FILES CREATED

```
contracts/ProviderAdapterBase.sol
contracts/CryptoAdapter.sol
contracts/CryptoAdapter.t.sol
workers/provider-sync/index.ts
workers/crypto-sync/index.ts
config/crypto/native-tokens.example.json
config/crypto/README.md
docs/reports/TASK-07-REPORT.md
```

## FILES MODIFIED / MOVED

```
contracts/interfaces/IProviderAdapter.sol   full shared interface (SyncEntry, events, errors)
contracts/RobinhoodAdapter.sol              → is ProviderAdapterBase
contracts/RobinhoodAdapter.t.sol            IProviderAdapter.SyncEntry / .ZeroAddress
workers/robinhood-sync/{7 files}.ts  →  workers/provider-sync/{...}.ts   (git-renamed, generalised)
workers/robinhood-sync/index.ts             thin spec
.env.example, .gitignore, README.md, config/robinhood/README.md,
docs/conventions.md §3, workers/README.md
```

Branch is based on `task/TASK-06-robinhood-adapter` (stacked — see PULL REQUEST).

## TESTS

`pnpm test` → Vitest, **15 files, 46 tests** (the 11 provider-sync tests moved from
`robinhood-sync/` and generalised — reconcile ×7, sync ×4; the sync suite now runs against a
`CRYPTO_NATIVE` provider id).

`pnpm contracts:test` (CI) → **55 Solidity tests pass** — the 47 from TASK-05/06 (Robinhood
behaviour unchanged after the refactor to a shared base) plus 8 `CryptoAdapter` tests, including the
cross-adapter shared-registry test.

`onchain.ts` / the worker glue are type-checked but not unit-tested (no chain in CI) — TASK-31.

## BUILD

`pnpm build` (JS) green — 5 routes, unchanged. `pnpm contracts:build` (CI) — `hardhat compile`
clean (`ProviderAdapterBase`, `RobinhoodAdapter`, `CryptoAdapter`, interfaces, mocks). Both CI jobs
green on the first push.

## LINT / TYPECHECK

Clean. The `workers/provider-sync/*` and `workers/crypto-sync/*` TS is inside the root `tsconfig`,
so `pnpm typecheck` covers it.

## SECURITY

STEP 5 AUDIT (`docs/spec/08-security-principles.md`):

| Concern | This TASK |
|---|---|
| No crypto asset added without explicit contract-address verification | `syncUpsert` (shared base) flows through the TASK-05 verification chain — `RepresentationRegistry` requires the token to be a contract with matching `decimals()`. Proven: `test_wrongDecimals_reverts` (declaring 18 for WBTC-8 reverts `DecimalsMismatch`) |
| Reuse the same registry + adapter interface as Robinhood, no NFFC-core change | `CryptoAdapter is ProviderAdapterBase` — identical code path; `RepresentationRegistry` byte-for-byte unchanged; `test_bothAdaptersShareOneRegistry` |
| Least privilege | `CryptoAdapter` is structurally locked to `CRYPTO` class + `CRYPTO_NATIVE` provider; separate `CRYPTO_SYNC_PRIVATE_KEY` (own blast radius). Same `SYNC_ROLE` trust boundary as Robinhood — TASK-32 threat model |
| Refactor safety | A shared base widens the blast radius of a base bug to both adapters — mitigated by 55 passing tests exercising both, and both adapters remaining tiny (3 constants each) |
| Secrets | `CRYPTO_SYNC_PRIVATE_KEY` env-only; the real `native-tokens.json` is git-ignored |
| Custom errors, events, CEI, no `tx.origin`, no custom crypto | Inherited from `ProviderAdapterBase` / the registries — unchanged from TASK-05/06 |

## PERFORMANCE

Not a perf TASK. Slightly *less* deployed bytecode duplication (shared base). `reconcile` /
`onchain.ts` cost is unchanged from TASK-06.

## KNOWN ISSUES

1. **Live-chain path untested locally** (viem glue, both workers) — TASK-31.
2. **Production crypto token source is a stub** — `jsonFileTokenSource` (seed / testnet) is real;
   a curated verified-address list / on-chain source plugs in behind `ProviderTokenSource`.
3. **`SYNC_ROLE` trust boundary** for both adapters — operational keys with real power; TASK-32.
4. **TASK-06 files moved.** `workers/robinhood-sync/{reconcile,sync,source,onchain,config,types,
   sync.test,reconcile.test}.ts` were git-renamed into `workers/provider-sync/`. Reviewers of the
   stack see them created in PR #7 then relocated here.
5. Carried: local Node 22.8 (blocks local Hardhat + `pnpm worker`); `vite@6` / `jsdom@25` overrides.

## ACCEPTANCE CRITERIA

`NFFC_Development_Plan.md` v3.2 TASK-07:

| Criterion | Status | Evidence |
|---|---|---|
| Second Provider/Network Adapter for native crypto (BTC, ETH …), Chainlink price source, verified WBTC/WETH-homolog addresses | Met | `CryptoAdapter.sol`; `SyncEntry.token` is the verified wrapped address; oracle metadata carried through |
| Deliverable: `CryptoAdapter.sol` + a metadata sync worker reusing the same adapter interface as TASK-06 | Met | `CryptoAdapter.sol` + `workers/crypto-sync/` — literally the same `ProviderAdapterBase` and `provider-sync` engine |
| Reuses the same Registry and Adapter interface as the Robinhood adapter, with no change to the NFFC core | Met | `RepresentationRegistry` unchanged; `IProviderAdapter` shared; `test_bothAdaptersShareOneRegistry` |
| No crypto asset is added without explicit contract-address verification | Met | TASK-05 verification chain; `test_wrongDecimals_reverts` |
| Available in the V1 mint — a creator can compose 100% crypto, 100% Stock Tokens, or mixed, from day one | Met (registry level) | Both providers register into one `RepresentationRegistry`; the mint UI surfacing this is TASK-17, the NFFC contract accepting mixed compositions is TASK-09 |

## PULL REQUEST

Branch `task/TASK-07-crypto-adapter`, based on **`task/TASK-06-robinhood-adapter`** (stacked;
TASK-01 → … → 07 not yet merged).

**PR: https://github.com/victorhmlz/nffc-protocol/pull/8** — base `task/TASK-06-robinhood-adapter`.
**CI: https://github.com/victorhmlz/nffc-protocol/actions/runs/34467008002 — success** — both jobs
(`lint · typecheck · test · build`; `solidity · compile · test` — 55 Solidity tests).

**Do not merge** — Project Lead reviews and authorizes. Merge order: #1 → … → #6 → #7 → this PR.

## NEXT TASK

**TASK-08 — Segmentación de Composición** (`NFFC_Development_Plan.md` v3.2): label each NFFC
`CRYPTO_ONLY` / `STOCK_ONLY` / `MIXED`, **derived automatically from the composition, never
declared**, reflecting the geographic-eligibility difference (Whitepaper §14). Depends on TASK-06 +
TASK-07. Blocked until the Project Lead merges this PR and authorizes TASK-08.
