# TASK 06 REPORT

## STATUS

COMPLETED

JS/TS gate `pnpm verify` (lint · typecheck · test · build) green locally. Contracts verified by CI
(Hardhat 3 needs Node ≥ 22.13; local box is 22.8). Both CI jobs on PR #7 pass — `verify` and
`contracts` (`hardhat compile` + 47 Solidity tests). See PULL REQUEST.

## OBJECTIVE

Sync Robinhood's official active Stock Token representations (`NFFC_Development_Plan.md` v3.2
TASK-06; `docs/spec/05-adapter-architecture.md`): `RobinhoodAdapter.sol` + an off-chain sync worker
that tolerates new assets, auto-deactivates delisted ones, and carries Chainlink oracle metadata.

## CHANGES

### On-chain

- **`contracts/interfaces/IProviderAdapter.sol`** — the shared on-chain adapter interface:
  `providerId()` + `syncDeactivate(bytes32)` (the uniform op; registration is provider-specific).
- **`contracts/RobinhoodAdapter.sol`** — the single authorised on-chain entry point for ROBINHOOD
  sync, `SYNC_ROLE`-gated (the off-chain signer), `DEFAULT_ADMIN_ROLE` = multisig.
  - `syncUpsert(SyncEntry)` — computes the deterministic `assetId` / `representationId`; **creates
    the `EQUITY` asset identity if missing**; **registers** the representation if missing, otherwise
    **refreshes its oracle metadata and re-activates it** (handles re-listing). Constants
    `PROVIDER_ID = "ROBINHOOD"`, `ASSET_CLASS = "EQUITY"`, `TOKEN_STANDARD = "ERC20"` — the adapter
    is structurally unable to touch other providers or asset classes.
  - `syncDeactivate(bytes32)` / `syncDeactivateByToken(address)` — mark a representation inactive.
  - Deploy wiring (TASK-31): `representationRegistry.registerProvider("ROBINHOOD", adapter)` +
    `assetRegistry.grantRole(REGISTRY_ADMIN_ROLE, adapter)`.
- **`contracts/RepresentationRegistry.sol`** — added `_repsByProvider` + `getRepresentationsByProvider
  (bytes32) view returns (bytes32[])` (interface too). The worker needs the full ROBINHOOD set to
  detect delistings. Small amendment to the TASK-05 contract, noted for review.
- **Tests** — `contracts/RobinhoodAdapter.t.sol` (13) + a `getRepresentationsByProvider` assertion
  in `RepresentationRegistry.t.sol`. **47 Solidity tests pass.**

### Off-chain worker — `workers/robinhood-sync/`

- **`reconcile.ts`** — the pure diff (fully unit-tested):
  - provider token with no on-chain representation → **upsert** (register)
  - representation inactive but token still listed → **upsert** (re-activate)
  - on-chain oracle metadata differs from the provider's → **upsert** (refresh)
  - **active** on-chain representation whose token left the provider list → **deactivate**
  - already-inactive delisted representation → leave alone
  - `computeRobinhoodRepresentationId` mirrors the contract's `keccak256(abi.encode(providerId,
    chainId, token))` so the worker needs no chain call to know an id.
- **`sync.ts`** — `runRobinhoodSync(deps)`: pull list + read on-chain in parallel → `reconcile` →
  apply upserts then deactivations, stopping promptly on `signal.aborted`. **All I/O injected** →
  tested with fakes, no chain.
- **`source.ts`** — `RobinhoodTokenSource` interface + `fixedTokenSource` (tests / in-memory) +
  `jsonFileTokenSource` (zod-validated file). The production feed (a Robinhood API or on-chain
  registry) plugs in behind this interface unchanged.
- **`onchain.ts`** — live viem read (`RepresentationRegistry`) / write (`RobinhoodAdapter`) with
  hand-written `parseAbi` fragments. Type-checked; behaviour against a real chain is TASK-31.
- **`config.ts`** — worker-scoped env (`CONTRACT_REPRESENTATION_REGISTRY`,
  `CONTRACT_ROBINHOOD_ADAPTER`, `ROBINHOOD_SYNC_PRIVATE_KEY`, `ROBINHOOD_TOKENS_FILE`). Not in
  `AppConfig` — these exist only after deployment.
- **`index.ts`** — thin `Worker` glue; if unconfigured (contracts undeployed) it logs and exits
  cleanly.
- **`config/robinhood/stock-tokens.example.json`** (+ README) — the seed shape; the real
  `stock-tokens.json` is git-ignored.

### Project

- **Worker runner decided**: `pnpm worker <path>` (= `tsx`, resolves `@…` aliases). `tsx` dep added.
  Needs Node ≥ 22.13.
- ESLint `workers/**` boundary (no `src/`, `next`, `react`).
- `.env.example`, `docs/conventions.md` §3, `workers/README.md`, `README.md`, `config/README.md`
  updated.

## FILES CREATED

```
contracts/interfaces/IProviderAdapter.sol
contracts/RobinhoodAdapter.sol
contracts/RobinhoodAdapter.t.sol
workers/robinhood-sync/{types,reconcile,source,sync,onchain,config,index}.ts
workers/robinhood-sync/{reconcile,sync}.test.ts
config/robinhood/stock-tokens.example.json
config/robinhood/README.md
docs/reports/TASK-06-REPORT.md
```

## FILES MODIFIED

```
contracts/RepresentationRegistry.sol      + _repsByProvider, getRepresentationsByProvider
contracts/RepresentationRegistry.t.sol    + provider-list assertion
contracts/interfaces/IRepresentationRegistry.sol  + getRepresentationsByProvider
.env.example                              Robinhood sync worker vars
.gitignore                                /config/robinhood/stock-tokens.json
README.md, config/README.md, workers/README.md, docs/conventions.md §3
eslint.config.mjs                         workers/** import boundary
package.json                              "worker" script; tsx dep
pnpm-lock.yaml
```

Branch is based on `task/TASK-05-asset-registry` (stacked — see PULL REQUEST).

## TESTS

`pnpm test` → Vitest, **15 files, 46 tests** (11 new):

```
✓ workers/robinhood-sync/reconcile.test.ts (7)  deterministic id; register-all; no-op; oracle drift;
                                                 re-activate relisted; deactivate delisted; leave
                                                 already-inactive alone
✓ workers/robinhood-sync/sync.test.ts (4)        register-all; deactivate delisted; no-op;
                                                 stops on abort
```

`pnpm contracts:test` (CI) → **47 Solidity tests pass**, incl. `RobinhoodAdapter` (13):
`providerId`; zero-arg constructor reverts (×2); `syncUpsert` new → asset + representation created +
event; second symbol → second asset; existing → oracle refreshed + re-activated after a delist, no
duplicate in the provider list; `syncDeactivate` by id; non-`SYNC_ROLE` reverts on upsert /
deactivate; `syncUpsert` idempotent on no change.

`onchain.ts` and `index.ts` (the live-chain glue) are type-checked but not unit-tested — no chain in
CI. Exercised end-to-end in TASK-31 (testnet).

## BUILD

`pnpm build` (JS) green — 5 routes, unchanged. `pnpm contracts:build` (CI) — `hardhat compile`
clean, solc 0.8.34, including `RobinhoodAdapter` and the amended registry. Both CI jobs green on the
first push.

## LINT / TYPECHECK

Clean. `workers/robinhood-sync/*` is inside the root `tsconfig`, so `pnpm typecheck` covers the
worker TS including the viem `parseAbi` struct ABIs and `runRobinhoodSync`. Two lint warnings on
unused mock params were fixed with typed `vi.fn<T>()`.

## SECURITY

STEP 5 AUDIT (`docs/spec/08-security-principles.md`):

| Concern | This TASK |
|---|---|
| No arbitrary address becomes a supported asset | `syncUpsert` is `SYNC_ROLE`-only and flows through the TASK-05 verification chain (`RepresentationRegistry` checks the token is a contract with matching `decimals()`); the worker's source is Robinhood's authoritative list, never user input |
| Auto-deactivate on delist | `reconcile` marks any active on-chain representation whose token left the provider list `toDeactivate`; `syncDeactivateByToken` applies it. Tested on-chain and off-chain |
| Oracle metadata consistent with Chainlink | The `oracle` (feed / heartbeat / feedDecimals) is carried through the sync entry into the registry; drift triggers a refresh. (The feed is trusted as given by the source — validating it *is* a live Chainlink aggregator is TASK-22.) |
| Least privilege | `RobinhoodAdapter` holds only `SYNC_ROLE` on itself + (by deploy wiring) the ROBINHOOD provider-adapter slot and `REGISTRY_ADMIN_ROLE` on `AssetIdentityRegistry`. It is structurally limited to `EQUITY` class and `ROBINHOOD` provider. **Trust boundary:** a compromised `SYNC_ROLE` key could register bogus Robinhood representations or create spurious `EQUITY` identities — the multisig mitigates by revoking the adapter / deactivating. Recorded for the TASK-32 threat model. |
| Secrets | `ROBINHOOD_SYNC_PRIVATE_KEY` is env-only, never committed; the real token list file is git-ignored; the logger redacts key-like fields (TASK-04) |
| Checks-effects-interactions | `RobinhoodAdapter` makes external calls to the registries only; it holds no value and no user assets |
| Idempotency | `runRobinhoodSync` + `syncUpsert` are idempotent — a second run with unchanged inputs is a no-op (tested both layers) |

## PERFORMANCE

Not a perf TASK. `reconcile` is O(provider + on-chain) with a `Map`/`Set`. `onchain.ts` reads the
provider list once then `getRepresentation` per id in parallel (`Promise.all`) — bounded by the
admin-curated ROBINHOOD set. The worker is one-shot, scheduled externally.

## KNOWN ISSUES

1. **Live-chain path untested locally.** `onchain.ts` (viem read/write) and `index.ts` are
   type-checked only; no chain in CI and no local Hardhat (Node 22.8). End-to-end verification is
   TASK-31.
2. **`RepresentationRegistry` amended** (added `getRepresentationsByProvider`). It stacks on the
   TASK-05 PR; noted so the Project Lead reviews it as part of this PR.
3. **Production token source is a stub.** `jsonFileTokenSource` (seed / testnet) is real;
   `HttpTokenSource` / an on-chain-Robinhood-registry source is left for when that feed's shape is
   known — behind the same `RobinhoodTokenSource` interface, so the reconciler/worker don't change.
4. **`SYNC_ROLE` trust boundary** (see SECURITY) — an operational key with real power; threat-modeled
   in TASK-32, mitigated by multisig revocation.
5. Carried: local Node 22.8 (blocks local Hardhat + `pnpm worker`); `vite@6` / `jsdom@25` overrides.

## ACCEPTANCE CRITERIA

`NFFC_Development_Plan.md` v3.2 TASK-06:

| Criterion | Status | Evidence |
|---|---|---|
| Sync Robinhood's official active Stock Token representations | Met | `RobinhoodAdapter.syncUpsert` + `workers/robinhood-sync/` (source → reconcile → apply) |
| Deliverable: `RobinhoodAdapter.sol` + off-chain sync worker (symbol, name, contract, chain, status, decimals, multiplier, oracle metadata, timestamps) | Met | All fields flow through `SyncEntry` → `RegisterParams`; `status`/timestamps set by the registry |
| Tolerates new assets without redeploying the core contract | Met | `syncUpsert` registers new `EQUITY` identities + representations with the deployed bytecode unchanged; tested (`test_syncUpsert_secondSymbol_createsSecondAsset`) |
| Automatically marks inactive any representation Robinhood delists | Met | `reconcile` → `toDeactivate` for active-but-unlisted; `syncDeactivateByToken`; tested both layers |
| Oracle metadata consistent with the confirmed provider (Chainlink) | Met | `oracle` carried end-to-end; drift → refresh. (Liveness validation of the feed is TASK-22.) |

## PULL REQUEST

Branch `task/TASK-06-robinhood-adapter`, based on **`task/TASK-05-asset-registry`** (stacked;
TASK-01 → … → 06 not yet merged).

**PR: https://github.com/victorhmlz/nffc-protocol/pull/7** — base `task/TASK-05-asset-registry`.
**CI: https://github.com/victorhmlz/nffc-protocol/actions/runs/34414462225 — success** — both jobs
(`lint · typecheck · test · build`; `solidity · compile · test` — 47 Solidity tests).

**Do not merge** — Project Lead reviews and authorizes. Merge order: #1 → #2 → #3 → #4 → #5 → #6 →
this PR.

## NEXT TASK

**TASK-07 — Crypto Native Adapter** (`NFFC_Development_Plan.md` v3.2): `CryptoAdapter.sol` + sync
worker for native crypto (BTC, ETH via Chainlink, verified WBTC/WETH-homolog addresses), **reusing
the same `RepresentationRegistry` and adapter pattern as TASK-06 with no change to the NFFC core**.
Depends on TASK-05. Blocked until the Project Lead merges this PR and authorizes TASK-07.
