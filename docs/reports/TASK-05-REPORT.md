# TASK 05 REPORT

## STATUS

COMPLETED

The JS/TS gate `pnpm verify` (lint · typecheck · test · build) is green locally. The **contracts**
are verified by CI only — Hardhat 3 requires Node ≥ 22.13 and the local machine is on 22.8 (`nvm`
does not respond in this non-interactive environment). Both CI jobs — `verify` and the new
`contracts` (`hardhat compile` + `hardhat test`) — pass on PR #6; see the PULL REQUEST section.

## OBJECTIVE

Implement `Asset Identity → Provider → Network → Representation` as an on-chain registry, designed
from day one for multiple providers (`NFFC_Development_Plan.md` v3.2 TASK-05;
`docs/spec/04-contract-interfaces.md` §1–2).

## CHANGES

- **Contracts toolchain: Hardhat 3** (Project Lead decision — pure Node/pnpm, cross-platform, one CI
  job, no separate binary). `hardhat.config.ts` at the repo root; solc **0.8.34** pinned;
  `@openzeppelin/contracts` 5.6 via npm; `forge-std` via a pinned Git dependency for the Solidity
  tests.
- **`contracts/interfaces/IAssetIdentityRegistry.sol`** — enum/struct/events/errors + `computeAssetId`,
  `registerAssetIdentity`, `setAssetStatus`, `getAssetIdentity`, `isActiveAsset`, `assetExists`.
- **`contracts/AssetIdentityRegistry.sol`** — `AccessControl`; `DEFAULT_ADMIN_ROLE` (multisig) grants
  roles, `REGISTRY_ADMIN_ROLE` adds/deactivates. `assetId = keccak256(abi.encode(assetClass, symbol))`
  — deterministic, so a symbol within a class registers exactly once. Rejects empty symbol / empty
  class / zero admin; `UnknownAsset` on unknown reads.
- **`contracts/interfaces/IRepresentationRegistry.sol`** — provider + representation model, oracle
  metadata, `RegisterParams` (no caller-set timestamps/status), full event + error set,
  `computeRepresentationId`.
- **`contracts/RepresentationRegistry.sol`** —
  - **Allowlist admission.** `registerRepresentation` is callable **only** by `REGISTRY_ADMIN_ROLE`
    or the calling provider's registered adapter — never an arbitrary account. It verifies: provider
    exists and is active; caller is authorised for *that* provider; asset identity is `ACTIVE`;
    `token != 0`, `token.code.length > 0` (is a contract); `IERC20Metadata(token).decimals()`
    resolves and equals the declared value (`try/catch` → `DecimalsMismatch` /
    `TokenMetadataUnavailable`); `chainId != 0`; `multiplier != 0`; `tokenStandard != 0`; no
    duplicate `representationId = keccak256(abi.encode(providerId, chainId, token))`.
  - **Provider registry.** `registerProvider` / `setProviderAdapter` / `setProviderActive` /
    `getProvider` — `REGISTRY_ADMIN_ROLE` only. Onboarding a second provider is a `registerProvider`
    call plus an adapter address; **no contract change**.
  - **Adapter-scoped authorisation.** An adapter address set for `providerId` may
    register/deactivate/re-status/update-oracle representations of *its own* provider, and no other.
  - **Immutable by construction.** After registration only `oracle` and `status` change; there is no
    setter for `assetId`, `token`, `decimals`, `multiplier`, `chainId`, or `providerId`.
  - Views: `getRepresentation`, `isActiveRepresentation`, `representationExists`, `resolvesTo`,
    `getRepresentationsByAsset`.
- **`contracts/mocks/`** — `MockERC20` (configurable `decimals()`), `NoMetadata` (has code, no
  `decimals()`).
- **`contracts/*.t.sol`** — forge-std Solidity tests (35 total). See §TESTS.
- **CI**: new `contracts` job in `.github/workflows/ci.yml` — `pnpm contracts:build` +
  `pnpm contracts:test`, on the same `.nvmrc` Node.
- **Project config**: `package.json` gains `"type": "module"` (Hardhat 3 requires an ESM project —
  authored code was already all-ESM), `engines.node >= 22.13.0`, `contracts:build` / `contracts:test`
  scripts, deps (`hardhat`, `@nomicfoundation/hardhat-toolbox-viem`, `@openzeppelin/contracts`,
  `forge-std`). `contracts/`, `hardhat.config.ts`, `artifacts/`, `cache/` excluded from the root
  `tsconfig`, ESLint, and Prettier (`*.sol` too). `.gitignore` for Hardhat artifacts.
- **Docs**: `docs/conventions.md` §6 (Contracts); `contracts/README.md`; `README.md` (status,
  layout, scripts, Node ≥ 22.13 prerequisite).

## FILES CREATED

```
hardhat.config.ts
contracts/README.md
contracts/AssetIdentityRegistry.sol
contracts/AssetIdentityRegistry.t.sol
contracts/RepresentationRegistry.sol
contracts/RepresentationRegistry.t.sol
contracts/interfaces/IAssetIdentityRegistry.sol
contracts/interfaces/IRepresentationRegistry.sol
contracts/mocks/MockERC20.sol
contracts/mocks/NoMetadata.sol
docs/reports/TASK-05-REPORT.md
```

## FILES MODIFIED

```
.github/workflows/ci.yml   new `contracts` job
.gitignore                 /artifacts /cache /types /.gas-snapshot /snapshots
.prettierignore            artifacts, cache, *.sol
README.md                  status, layout, scripts, Node ≥ 22.13
docs/conventions.md        §6 Contracts
eslint.config.mjs          ignore contracts/, hardhat.config.ts, artifacts/, cache/
package.json               "type": "module"; engines.node ≥ 22.13; contracts:* scripts; 4 deps
pnpm-lock.yaml             lockfile
tsconfig.json              exclude contracts, hardhat.config.ts, artifacts, cache
```

Branch is based on `task/TASK-04-infrastructure` (stacked — see PULL REQUEST).

## TESTS

`pnpm contracts:test` → Hardhat 3 Solidity tests, **35 passing** (13 in `AssetIdentityRegistryTest`,
22 in `RepresentationRegistryTest`), across two files:

**AssetIdentityRegistry** — zero-admin constructor revert; roles granted to admin; register →
active + event + stored fields; non-admin register reverts (`AccessControlUnauthorizedAccount`);
duplicate (same symbol+class) reverts; empty symbol / empty class revert; `setAssetStatus`
deactivates; unknown-asset status/read revert; non-admin status revert; `computeAssetId` matches the
registered id; fuzz — `computeAssetId` is `keccak256(abi.encode(assetClass, symbol))` for 256 random
inputs.

**RepresentationRegistry** —
- happy path: admin registers → id = `computeRepresentationId` → active, `resolvesTo`, stored
  fields, `getRepresentationsByAsset`; a provider's adapter can register for its own provider.
- **acceptance — no arbitrary address**: a stranger, an adapter for a *different* provider, an EOA
  `token`, and a code-but-no-`decimals()` `token` all revert; a decimals mismatch reverts.
- **acceptance — multi-provider, no contract change**: after `registerProvider(ROBINHOOD)` and
  `registerProvider(CRYPTO_NATIVE)`, a Robinhood Stock-Token representation **and** a crypto (WBTC)
  representation both register and coexist, with correct `providerId` / `decimals` / `token`.
- guards: inactive asset, unknown provider, inactive provider, zero multiplier, duplicate
  representation, unknown-representation status change, empty/duplicate provider id, zero-address
  constructor args.
- lifecycle: adapter `deactivateRepresentation` → inactive; admin `setRepresentationStatus` back to
  active; `updateOracleMetadata` changes only the oracle, leaving identity fields intact.
- `registerProvider` is admin-only.

Two tests failed on the first CI run and were fixed: `registry.REGISTRY_ADMIN_ROLE()` is an external
call and, placed between `vm.prank(stranger)` and the target, consumed the prank; the role is now
read into a local before pranking.

## BUILD

`pnpm contracts:build` → `hardhat compile` — compiles cleanly (solc 0.8.34; `AssetIdentityRegistry`,
`RepresentationRegistry`, interfaces, mocks, and the forge-std test surface). The first CI run
failed here with "Hardhat only supports ESM projects" — resolved by adding `"type": "module"`.

`pnpm verify` (JS/TS) stays green with `"type": "module"`: lint · typecheck · test 35/35 · build
(5 routes).

## LINT / TYPECHECK

- `pnpm lint` / `pnpm typecheck` — unchanged, clean. `contracts/` + `hardhat.config.ts` are outside
  the JS toolchain's scope by design.
- Solidity: `hardhat compile` is the check (no `solhint` yet — added with the security-hardening
  pass, TASK-27/32).

## SECURITY

STEP 5 AUDIT (`docs/spec/08-security-principles.md`):

| Rule | This TASK |
|---|---|
| OpenZeppelin `AccessControl` | Both registries; `DEFAULT_ADMIN_ROLE` = multisig grants `REGISTRY_ADMIN_ROLE` |
| No arbitrary address becomes a supported asset | `registerRepresentation` role/adapter-gated + token verification (contract check + `decimals()` match). Proven by tests: stranger, wrong-provider adapter, EOA, no-metadata token all revert |
| No single-provider assumption | `providerId` is a parameter; second provider = `registerProvider` + adapter, no code change. Proven by test |
| Least privilege | Adapter scoped to its own `providerId`; cross-provider write reverts `NotProviderAuthorized`. Proven by test |
| Immutable composition inputs | Only `oracle` + `status` mutable post-registration; no setter for identity fields |
| Custom errors, complete events | Every failure is a named error; `AssetIdentityRegistered` / `RepresentationRegistered` / status / oracle / provider events all present |
| Pinned pragma | `pragma solidity 0.8.34;` on deployables; `^0.8.20` on interfaces |
| Checks-effects-interactions | State written before the single external interaction (`decimals()` is a `view` call made during checks; no value transfer here) |
| No `tx.origin`, no custom crypto | Confirmed — `msg.sender` + roles; `keccak256`/`abi.encode` only |
| Reentrancy | No value transfer and no external call after state write; `ReentrancyGuard` not needed here (it is for `Marketplace`, TASK-19) |

Open items for later: `solhint` + a written threat model + fuzzing on the critical paths are TASK-32;
`Pausable` on the registries is not required by the spec and was not added (Rule 6). `_verifyDecimals`
requires the token to expose `decimals()` — acceptable for V1 (Robinhood Stock Tokens and WBTC/WETH
homologs all do); documented in `contracts/README.md`.

## PERFORMANCE

Not a perf TASK. Gas-relevant choices: deterministic ids (`keccak256`) instead of counters + extra
storage; `Provider` packs into one slot (`bool,bool,address`); `getRepresentationsByAsset` returns
the stored array as-is (bounded by admin curation, not user input). A `_repsByAsset` array grows
unbounded in theory — acceptable for an admin-curated allowlist; revisit if it ever becomes large.

## KNOWN ISSUES

1. **Contracts verified by CI only.** Hardhat 3 needs Node ≥ 22.13; the local box is 22.8 and `nvm`
   is unresponsive in this environment. `engines.node` now states the real floor. The Project Lead
   should bump local Node so contracts can be iterated locally (this has blocked local verification
   since TASK-01 and now hard-blocks Hardhat).
2. **`"type": "module"` added to the root `package.json`.** Required by Hardhat 3. All authored code
   was already ESM and `pnpm verify` is unchanged, but it is a project-wide setting worth the
   Project Lead's notice.
3. **Deviation from the TASK-00 pseudocode.** `docs/spec/04-contract-interfaces.md` §2 sketched
   `registerRepresentation(Representation calldata)`; the implementation takes `RegisterParams`
   (no caller-set `createdAt`/`updatedAt`/`status`) and adds a provider registry + adapter-scoped
   auth. The pseudocode marked such details `// OPEN`; this is a concretization, noted for review.
4. **`forge-std` via a pinned Git dependency** (`foundry-rs/forge-std#v1.16.2`) — matches the Hardhat
   3 template. CI clones it on install.
5. Carried: local Node 22.8 and the `vite@6` / `jsdom@25` `pnpm-workspace.yaml` overrides — unchanged.

## ACCEPTANCE CRITERIA

`NFFC_Development_Plan.md` v3.2 TASK-05:

| Criterion | Status | Evidence |
|---|---|---|
| `Asset Identity → Provider → Network → Representation` as an on-chain registry, multi-provider from day one | Met | `AssetIdentityRegistry` + `RepresentationRegistry` (with a provider registry); `chainId` is a per-representation field |
| Only addresses verified by the registry can be registered as a Representation | Met | `registerRepresentation` verification chain; tests: EOA / no-metadata / decimals-mismatch all revert |
| No user can turn an arbitrary address into a supported asset | Met | `registerRepresentation` is `REGISTRY_ADMIN_ROLE`- or provider-adapter-gated; stranger reverts `NotProviderAuthorized` |
| AccessControl restricts add/remove to administrative roles | Met | OZ `AccessControl`; `REGISTRY_ADMIN_ROLE` on every mutating admin path; `DEFAULT_ADMIN_ROLE` (multisig) grants roles |
| The registry assumes no single provider — adding a second (crypto) needs no contract change | Met | `providerId` parameterized; `test_secondProvider_worksWithoutContractChange` registers a Robinhood **and** a crypto representation with the deployed bytecode unchanged |
| `AssetIdentityRegistry.sol`, `RepresentationRegistry.sol`, access + validation tests | Met | Files above; 35 Solidity tests |

## PULL REQUEST

Branch `task/TASK-05-asset-registry`, based on **`task/TASK-04-infrastructure`** (stacked;
TASK-01 → 02 → 03 → 04 → 05 not yet merged).

**PR: https://github.com/victorhmlz/nffc-protocol/pull/6** — base `task/TASK-04-infrastructure`.
**CI: https://github.com/victorhmlz/nffc-protocol/actions/runs/34412856715 — success** — both jobs:
`lint · typecheck · test · build` and `solidity · compile · test` (35 Solidity tests).

Rebase onto `main` and retarget the base as the parent PRs merge. **Do not merge** — Project Lead
reviews and authorizes. Merge order: PR #1 → #2 → #3 → #4 → #5 → this PR.

## NEXT TASK

**TASK-06 — Robinhood Adapter** (`NFFC_Development_Plan.md` v3.2): `RobinhoodAdapter.sol` +
off-chain sync worker that pulls Robinhood's official active Stock Token list and reconciles it into
`RepresentationRegistry` (symbol, name, contract, chain, status, decimals, multiplier, oracle
metadata, timestamps), tolerating new assets and auto-deactivating delisted ones. First real worker
— its TS runner is decided here (`tsx` on the bumped Node, Node native type-stripping, or a `tsc`
build). Depends on TASK-05. Blocked until the Project Lead merges this PR and authorizes TASK-06.
