# `contracts/`

Solidity smart contracts. Toolchain: **Hardhat 3** (`hardhat.config.ts` at the repo root).
Solc pinned to **0.8.34** (`pragma solidity 0.8.34;` in concrete contracts; interfaces `^0.8.20`).

**Requires Node ≥ 22.13** (Hardhat 3). Local dev on older Node can't run these commands — CI does
(`.nvmrc` resolves to a supported 22.x).

```bash
pnpm contracts:build   # hardhat compile
pnpm contracts:test    # hardhat test  (runs contracts/*.t.sol via forge-std)
```

## Layout

| Path                                                                              | Contents                                                                                       | TASK              |
| --------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | ----------------- |
| `interfaces/IAssetIdentityRegistry.sol`, `interfaces/IRepresentationRegistry.sol` | Registry interfaces                                                                            | TASK-05           |
| `interfaces/IProviderAdapter.sol`                                                 | Shared provider-adapter interface (`SyncEntry`, events, 5 methods)                             | TASK-06/07        |
| `AssetIdentityRegistry.sol`                                                       | Allowlist of asset identities (`REGISTRY_ADMIN_ROLE`)                                          | TASK-05           |
| `RepresentationRegistry.sol`                                                      | Allowlist of verified representations; provider registry; adapter-scoped auth                  | TASK-05           |
| `ProviderAdapterBase.sol`                                                         | Abstract — all provider-sync logic; subclass supplies `providerId`/`assetClass`/token standard | TASK-06/07        |
| `RobinhoodAdapter.sol` / `CryptoAdapter.sol`                                      | Two peers on that base — Robinhood Stock Tokens, native crypto                                 | TASK-06 / TASK-07 |
| `lib/CompositionSegmentLib.sol`                                                   | Derive `CRYPTO_ONLY` / `STOCK_ONLY` / `MIXED` from a composition — used by `NFFC.sol`          | TASK-08           |
| `interfaces/INFFC.sol`                                                            | ERC-721 core interface (`Component`, `MintParams`, mint events, invariant errors I1–I7)        | TASK-09           |
| `NFFC.sol`                                                                        | ERC-721 core — immutable weighted composition; enforces I1–I8 at mint; derived segment; pausable mint | TASK-09      |
| `interfaces/ICollection.sol`                                                      | Collection interface (`CreateParams`, creation-fee quote, creator ownership)                   | TASK-10           |
| `interfaces/IFeeConfig.sol`                                                       | On-chain fee configuration — the single source of truth for every protocol fee                | TASK-10 (impl TASK-30) |
| `Collection.sol`                                                                  | Creator-owned NFFC groupings; creation fee read from `IFeeConfig`, forwarded to the treasury  | TASK-10           |
| `mocks/`                                                                          | Test doubles (`MockERC20`, `NoMetadata`, `MockFeeConfig`, `RejectEther` / `ReenterOnReceive`) | —                 |
| `*.t.sol`                                                                         | forge-std Solidity tests, colocated                                                            | —                 |

Later: `Marketplace.sol` (TASK-19), `FeeConfig.sol` (TASK-30, implementing `IFeeConfig`).
Deployment (Ignition) lands in TASK-31.

## Rules (`docs/spec/08-security-principles.md`)

- OpenZeppelin `AccessControl`; `DEFAULT_ADMIN_ROLE` is the protocol multisig and grants all roles.
- No arbitrary address becomes a supported asset — `registerRepresentation` is role/adapter gated
  and verifies the token (is a contract, `decimals()` matches).
- Segments are **derived, never declared** — `NFFC.sol` computes the segment from the registry at
  mint (`CompositionSegmentLib`).
- Pinned pragma, custom errors, complete events, checks-effects-interactions.
- Adapters are **peers** — one base, one interface, no hierarchy. A third provider is a new
  subclass + `registerProvider`, with no core change.
