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

| Path                                     | Contents                                                                               | TASK    |
| ---------------------------------------- | -------------------------------------------------------------------------------------- | ------- |
| `interfaces/IAssetIdentityRegistry.sol`  | Asset Identity registry interface                                                      | TASK-05 |
| `interfaces/IRepresentationRegistry.sol` | Representation registry interface                                                      | TASK-05 |
| `AssetIdentityRegistry.sol`              | Allowlist of asset identities (`REGISTRY_ADMIN_ROLE`)                                  | TASK-05 |
| `RepresentationRegistry.sol`             | Allowlist of verified on-chain representations; provider registry; adapter-scoped auth | TASK-05 |
| `*.t.sol`                                | Solidity tests (forge-std `Test`) — access control, validation, multi-provider         | TASK-05 |
| `mocks/`                                 | Test doubles (`MockERC20`, `NoMetadata`)                                               | TASK-05 |

Later: `Collection.sol` (TASK-10), `NFFC.sol` (TASK-09), `Marketplace.sol` (TASK-19),
`FeeConfig.sol` (TASK-30), adapters (TASK-06/07). Deployment scripts (Ignition) land in TASK-31.

## Rules (`docs/spec/08-security-principles.md`)

- OpenZeppelin `AccessControl`; `DEFAULT_ADMIN_ROLE` is the protocol multisig and grants all roles.
- No arbitrary address becomes a supported asset — `registerRepresentation` is role/adapter gated
  and verifies the token (is a contract, `decimals()` matches).
- Pinned pragma, custom errors, complete events, checks-effects-interactions.
- The contracts make **no single-provider assumption** — a second provider is `registerProvider` +
  an adapter, with no code change.
