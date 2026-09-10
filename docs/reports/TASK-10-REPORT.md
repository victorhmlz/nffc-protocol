# TASK 10 REPORT

## STATUS

COMPLETED

`pnpm verify` (lint · typecheck · test · build) green locally. `pnpm contracts:build` +
`pnpm contracts:test` green locally on Node 22.13.0 — **114 Solidity tests** (92 → +22). Both CI
jobs on PR #12 pass — run `34530139448` (`lint · typecheck · test · build`; `solidity · compile ·
test`). See PULL REQUEST.

## OBJECTIVE

Collections and a configurable creation fee that scales with composition complexity: `Collection.sol`
with fee-quote logic and creator ownership (`NFFC_Development_Plan.md` v3.2 TASK-10;
`docs/spec/04-contract-interfaces.md` §5; `docs/spec/06-fee-model.md` §1–4).

## CHANGES

### `contracts/interfaces/IFeeConfig.sol` (new)

The single on-chain source of truth for every protocol fee, per `docs/spec/04-contract-interfaces.md`
§7 — five getters (`collectionCreationFee` / `mintFee` / `marketplaceFeeBps` / `royaltyBps` /
`feeRecipient`), five change events, `FeeOutOfBounds` / `NotFeeAdmin`, five `FEE_ADMIN_ROLE` setters.
The concrete `FeeConfig.sol` (curve encoding in the `params` blobs, on-chain hard caps) is **TASK-30**;
this TASK only fixes the interface `Collection.sol` reads through.

### `contracts/interfaces/ICollection.sol` (new)

`docs/spec/04-contract-interfaces.md` §5: `CreateParams` (`name`, `metadataURI`,
`expectedComponentCount` — fee-quote input, *not* a cap), `CollectionCreated` /
`CollectionMetadataUpdated` events, `NotCollectionOwner` / `CollectionCreationFeeNotMet` plus
impl-support errors `ZeroAddress` / `UnknownCollection` / `FeeTransferFailed`.

### `contracts/Collection.sol` (new)

`contract Collection is ICollection, AccessControl, Pausable, ReentrancyGuard`, pragma `0.8.34`.

- **`createCollection(CreateParams)` — `payable nonReentrant whenNotPaused`.** Reads
  `feeConfig.collectionCreationFee(expectedComponentCount)`; requires `msg.value` to equal it
  **exactly** (over- and under-payment both revert `CollectionCreationFeeNotMet(provided, required)`
  — the UI quotes the exact fee before signing, `06-fee-model.md` §5). Then assigns the next id,
  records `creator` + `metadataURI`, emits `CollectionCreated` (+ `CollectionMetadataUpdated` when a
  URI is given), and **forwards the fee to `feeConfig.feeRecipient()` as the last action** (CEI);
  `FeeTransferFailed` on a rejected transfer. The contract never holds a balance.
- **`quoteCollectionCreationFee(n)`** — passes straight through to `IFeeConfig` so the frontend
  reads the live value and never hardcodes it.
- **`setCollectionMetadata(id, uri)`** — creator only (`UnknownCollection` then `NotCollectionOwner`);
  emits `CollectionMetadataUpdated`. Not pausable — an owner keeps control of their own metadata.
- **`ownerOfCollection`**, plus `collectionMetadataURI` / `collectionExists` conveniences
  (`UnknownCollection` on a missing id).
- **Pausing** — `pause()` / `unpause()` behind `PAUSER_ROLE` (granted to the deploy `admin` with
  `DEFAULT_ADMIN_ROLE`); gates `createCollection` only.
- Constructor takes `admin` and the `IFeeConfig` address (both zero-checked); `feeConfig` is
  `immutable`.

### Mocks (new)

`mocks/MockFeeConfig.sol` — full `IFeeConfig`; creation/mint fee is an affine non-decreasing curve
`base + slope·(n−1)` with openly settable params. `mocks/FeeRecipients.sol` — `RejectEther` (no
`receive`) and `ReenterOnReceive` (re-enters `createCollection` on receipt) for the failure/reentrancy
paths.

### Docs

`contracts/README.md` — `ICollection` / `IFeeConfig` / `Collection` rows, mocks list, "Later:".
`README.md` — status line.

## FILES CREATED

```
contracts/interfaces/IFeeConfig.sol
contracts/interfaces/ICollection.sol
contracts/Collection.sol
contracts/Collection.t.sol
contracts/mocks/MockFeeConfig.sol
contracts/mocks/FeeRecipients.sol
docs/reports/TASK-10-REPORT.md
```

## FILES MODIFIED

```
contracts/README.md    Collection / interface / mock rows
README.md              status line
```

Branch is based on `task/TASK-09-nffc-contract` — see PULL REQUEST.

## TESTS

`pnpm test` (JS) → Vitest, **17 files, 56 tests** — unchanged (no JS/TS touched).

`pnpm contracts:test` → **114 Solidity tests** (92 + 22 new in `Collection.t.sol`):

```
happy path      create → id 1, ownerOfCollection, metadataURI, exists; fee forwarded to the
                treasury; contract balance 0; CollectionCreated + CollectionMetadataUpdated emitted
                id increments 1→2; zero-fee curve; empty metadataURI
fee gate        underpay → CollectionCreationFeeNotMet(v, r); overpay → same; rejected transfer →
                FeeTransferFailed; re-entrant fee recipient → blocked (surfaces as FeeTransferFailed)
quoting         quote == config, monotonic non-decreasing over n = 1..20; live fee change reflected
                with no redeploy (TASK-10 acceptance)
metadata        creator updates → event; non-owner → NotCollectionOwner; unknown id → UnknownCollection
views           ownerOfCollection / collectionMetadataURI on unknown id → UnknownCollection; exists
pausing         paused → EnforcedPause on create; unpause restores; non-pauser → AccessControl…
construction    zero admin / zero fee config → ZeroAddress
fuzz            n ∈ [1,20] × random affine curve (256 runs) → pays exact fee, treasury credited,
                contract balance 0
```

## BUILD

`pnpm build` (JS) green — 5 routes, unchanged. `pnpm contracts:build` — `hardhat compile` clean with
solc 0.8.34 (`Collection`, `ICollection`, `IFeeConfig`, 2 mocks added).

## LINT / TYPECHECK

Clean. No JS/TS surface changed.

## SECURITY

STEP 5 AUDIT (`docs/spec/08-security-principles.md`):

| Concern | This TASK |
|---|---|
| **S1** OpenZeppelin for AccessControl / Pausable / ReentrancyGuard | OZ 5.6.1; nothing reimplemented |
| **S4 / S5** checks-effects-interactions; reentrancy on a value-moving path | `createCollection` checks `msg.value`, writes all state, emits, **then** forwards the fee via a low-level `call` as the final step; whole function is `nonReentrant`. `test_create_reentrancy_blocked` drives a malicious fee recipient that re-enters and is stopped |
| **S6** custom errors, complete events | `CollectionCreated` / `CollectionMetadataUpdated` on every state change; one error per failure |
| **S7 / S8** least privilege, multisig | Only `PAUSER_ROLE`; `DEFAULT_ADMIN_ROLE` + `PAUSER_ROLE` to the deploy `admin` (multisig in production, TASK-31) |
| **S9** no hardcoded fees | The fee is read from `IFeeConfig` at call time; `quoteCollectionCreationFee` exposes the live value for the UI; a fee change is one admin tx on `IFeeConfig` with no redeploy of `Collection` or `NFFC` (`test_quote_reflectsConfigChange_noRedeploy`) |
| **S11** pausable create | `whenNotPaused` on `createCollection`; metadata edits stay available to owners |
| **S12** no custody | The fee is forwarded to the treasury in the same call; `address(coll).balance` is asserted `0` in the happy path and the fuzz test — the contract never accrues ETH |
| **S14** pinned pragma | `0.8.34` for `Collection.sol`; `^0.8.20` for the interfaces |
| Threat-model seed (`§3` "Admin", "Frontend") | Fee-param drift is impossible (single on-chain source, read live); fee cap / `1..20` domain enforcement belongs to `IFeeConfig` (TASK-30). Recorded |

## PERFORMANCE

`createCollection` is O(1): one `IFeeConfig` read, two `SSTORE`s, up to two events, one value
transfer. No loops.

## KNOWN ISSUES

1. **`FeeConfig.sol` is TASK-30.** This TASK ships the `IFeeConfig` interface (per spec §7) and a
   mock; the concrete config — fee-curve encoding in the `params` blobs and the on-chain hard caps —
   lands in TASK-30. `Collection` is wired to a real `IFeeConfig` address at deploy (TASK-31).
2. **Mint-fee wiring is still TASK-30.** `NFFC.sol` continues to reject any `msg.value`; collecting
   the mint fee in `mint()` (also read from `IFeeConfig`) is TASK-30, not this TASK.
3. **`expectedComponentCount` is not range-checked in `Collection`.** It is passed straight to
   `IFeeConfig`; the `1 ≤ n ≤ 20` domain and the hard cap are `IFeeConfig`'s contract
   (`06-fee-model.md` §2). The mock rejects `n == 0`.
4. **Exact-payment only.** `createCollection` requires `msg.value == required` with no refund of
   excess — matches the UI quoting the exact fee before signing and avoids a refund reentrancy
   surface. Both over- and under-payment revert `CollectionCreationFeeNotMet`.
5. **No `Collection` ↔ `NFFC` link yet.** `NFFC.mint` records an arbitrary `collectionId` without
   checking it exists here or that the minter is permitted by the collection. Cross-contract
   enforcement is a later integration point (also noted in TASK-09); recorded for the TASK-32 threat
   model.
6. Carried: the PR stack (TASK-00…09 + `chore/bump-node-22-12`) is unmerged; this branch stacks on
   `task/TASK-09-nffc-contract`.

## ACCEPTANCE CRITERIA

`NFFC_Development_Plan.md` v3.2 TASK-10:

| Criterion | Status | Evidence |
|---|---|---|
| Fee is read from on-chain configuration, never hardcoded in the frontend | Met | `Collection` reads `IFeeConfig.collectionCreationFee(n)` at call time; `quoteCollectionCreationFee` exposes the live value; `test_quote_matchesConfig_andMonotonic`, `test_quote_reflectsConfigChange_noRedeploy` |
| Changing the fee requires no redeploy of the NFFC contract | Met | The fee lives in a separate `IFeeConfig` contract; a change is an admin tx there — `Collection` and `NFFC` are untouched. `test_quote_reflectsConfigChange_noRedeploy` changes the fee live against the same `Collection` instance |
| `Collection.sol`, fee-calculation logic, creator ownership | Met | `contracts/Collection.sol` — `createCollection` (fee via `IFeeConfig`), `quoteCollectionCreationFee`, `ownerOfCollection` / `setCollectionMetadata` (creator-gated) |

## PULL REQUEST

Branch `task/TASK-10-collection-contract`, based on **`task/TASK-09-nffc-contract`** (the stack
TASK-00…09 + `chore/bump-node-22-12` is not yet merged).

**PR: https://github.com/victorhmlz/nffc-protocol/pull/12** — base `task/TASK-09-nffc-contract`.
**CI: https://github.com/victorhmlz/nffc-protocol/actions/runs/34530139448 — success** — both jobs.

**Do not merge** — Project Lead reviews and authorizes. Merge order: #1 → … → #9 → #10 (chore)
→ #11 (TASK-09) → this PR.

## NEXT TASK

**TASK-11 — Metadata Architecture** (`NFFC_Development_Plan.md` v3.2): separate immutable static
metadata (composition, art) from dynamic market data (price, NAV) served by the API and never stored
as permanent on-chain truth. Depends on TASK-09. Blocked until the Project Lead merges this PR and
authorizes TASK-11.
