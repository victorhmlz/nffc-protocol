# TASK 09 REPORT

## STATUS

COMPLETED

`pnpm verify` (lint · typecheck · test · build) green locally. `pnpm contracts:build` +
`pnpm contracts:test` green locally on Node 22.13.0 — **92 Solidity tests** (61 → +31). See
PULL REQUEST for CI.

## OBJECTIVE

Implement the protocol's central contract: `NFFC.sol`, an ERC-721 whose immutable, weighted
composition of verified on-chain asset representations is validated at mint against the
registries, enforcing invariants I1–I8 (`NFFC_Development_Plan.md` v3.2 TASK-09;
`docs/spec/02-domain-model.md` §4; `docs/spec/04-contract-interfaces.md` §4).

## CHANGES

### `contracts/interfaces/INFFC.sol` (new)

The NFFC-specific interface surface: `Component` (`assetId`, `representationId`, `weightBps`) and
`MintParams` structs; `NFFCMinted` + `NFFCCompositionRecorded` events; one custom error per
invariant (`InvalidComponentCount`, `WeightSumNot10000`, `DuplicateAsset`, `ZeroWeight`,
`RepresentationNotActive`, `RepresentationAssetMismatch`, `CompositionIsImmutable`) plus
`ZeroAddress` / `UnexpectedPayment`. Pragma `^0.8.20`, matching the other interfaces. ERC-721 /
metadata come from OpenZeppelin on the concrete contract, not this interface.

### `contracts/NFFC.sol` (new)

`contract NFFC is INFFC, ERC721URIStorage, AccessControl, Pausable, ReentrancyGuard`, pragma
`0.8.34`.

- **`mint(MintParams)` — `payable nonReentrant whenNotPaused`.** Single pass over the components
  enforcing, in order: I4 (`weightBps > 0`), I3 (no duplicate `assetId`, nested loop over
  `n ≤ 20`), I5 (`representationRegistry.isActiveRepresentation` — false for an unknown id, so
  "not registered" and "registered but INACTIVE" are one branch), I6
  (`representationRegistry.resolvesTo(representationId, assetId)`); then I1 (`1 ≤ n ≤ 20`, checked
  up-front) and I2 (`Σ weightBps == 10 000`). On success it writes the composition **once**
  (`Component[]` storage, no code path rewrites it — I7), stores the composition hash
  (`keccak256(abi.encode(components))` in mint order), the derived segment, the `collectionId`,
  and the token URI, emits `NFFCMinted` + `NFFCCompositionRecorded` (I8), and calls `_safeMint`
  **last** (checks-effects-interactions; the receiver hook cannot re-enter `mint`).
- **Segment derived, never declared.** `isCryptoNative[i]` comes from the Asset Identity's class
  (`assetRegistry.getAssetIdentity(assetId).assetClass == "CRYPTO"`), fed to
  `CompositionSegmentLib.deriveSegment` and stored as `uint8`. Asset-class use for segmentation is
  the one path `docs/spec/05-adapter-architecture.md` §2 sanctions; it is not a per-provider
  branch and gates nothing.
- **Fee.** `mint` is `payable` per the spec, but until `IFeeConfig` exists (TASK-30) it reverts
  `UnexpectedPayment` on any non-zero `msg.value` — no ETH is ever trapped.
- **Views.** `getComposition`, `getCompositionHash`, `getSegment`, `getCollectionId` (each
  `_requireOwned`-guarded); `getStaticRarity` is a `virtual` TASK-14 hook returning `0`.
- **Pausing.** `pause()` / `unpause()` behind `PAUSER_ROLE` (granted to the deploy `admin`
  alongside `DEFAULT_ADMIN_ROLE`); only `mint` is gated — transfers are never paused, so an owner
  can always exit.
- Constructor takes the asset registry and representation registry addresses explicitly (all
  three args zero-checked).

### `contracts/NFFC.t.sol` (new) — 31 tests

Happy path + every invariant + edge cases + fuzz (see TESTS).

### Docs

`contracts/README.md` — `INFFC.sol` / `NFFC.sol` rows, removed from "Later:". `README.md` — status
line.

## FILES CREATED

```
contracts/interfaces/INFFC.sol
contracts/NFFC.sol
contracts/NFFC.t.sol
docs/reports/TASK-09-REPORT.md
```

## FILES MODIFIED

```
contracts/README.md    INFFC.sol / NFFC.sol rows
README.md              status line
```

Branch is based on `chore/bump-node-22-12` (TASK-01…08 + the Node bump) — see PULL REQUEST.

## TESTS

`pnpm test` (JS) → Vitest, **17 files, 56 tests** — unchanged (no JS/TS touched).

`pnpm contracts:test` → **92 Solidity tests** (61 + 31 new in `NFFC.t.sol`), run locally on
Node 22.13.0 and in CI:

```
happy path        mint 2-component → tokenId 1, owner, tokenURI, hash, segment MIXED,
                  staticRarity 0, collectionId; NFFCMinted + NFFCCompositionRecorded emitted
                  tokenId increments 1→2; exactly 1 component; exactly 20 components
I1                0 components → InvalidComponentCount(0); 21 → InvalidComponentCount(21)
I2                Σ 9999 → WeightSumNot10000(9999); Σ 10001 → WeightSumNot10000(10001)
I3                duplicate assetId → DuplicateAsset(assetId)
I4                weightBps 0 → ZeroWeight(assetId)
I5                unknown representationId → RepresentationNotActive; INACTIVE rep →
                  RepresentationNotActive
I6                rep resolves to a different assetId → RepresentationAssetMismatch(rep, assetId)
segmentation      all-stock → STOCK_ONLY; all-crypto → CRYPTO_ONLY; mixed providers → MIXED
composition hash  == keccak256(abi.encode(components)); order-sensitive (swap → different hash)
immutability      composition/hash/segment unchanged after transfer; no mutator selector exists
views             getComposition/Hash/Segment/StaticRarity/CollectionId revert
                  ERC721NonexistentToken(999)
fee               mint{value: 1} → UnexpectedPayment
pausing           paused → EnforcedPause on mint; unpause restores; non-pauser → AccessControl…
construction      zero admin / asset registry / representation registry → ZeroAddress
ERC-721           name/symbol; supportsInterface ERC721 / ERC721Metadata / IAccessControl / ERC165
fuzz              two-component weights w1∈[1,9999], w2 = 10000−w1 (256 runs) → mints, MIXED;
                  component count k∈[1,20] all-crypto (256 runs) → mints, CRYPTO_ONLY, length k
```

## BUILD

`pnpm build` (JS) green — 5 routes, unchanged. `pnpm contracts:build` — `hardhat compile` clean
with solc 0.8.34 (`NFFC` + `INFFC` added; 18 files).

## LINT / TYPECHECK

Clean. No JS/TS surface changed.

## SECURITY

STEP 5 AUDIT (`docs/spec/08-security-principles.md`):

| Concern | This TASK |
|---|---|
| **S1** OpenZeppelin for ERC-721 / AccessControl / Pausable / ReentrancyGuard | All four are OZ 5.6.1; nothing reimplemented |
| **S4 / S5** checks-effects-interactions; reentrancy | `mint` validates → writes all state + emits → `_safeMint` **last**; `nonReentrant` so the ERC-721 receiver hook cannot re-enter. No value leaves the contract; non-zero `msg.value` is rejected |
| **S6** custom errors, complete events | One error per invariant; `NFFCMinted` (hash + count) and `NFFCCompositionRecorded` (full component list) on every mint (I8) |
| **S7 / S8** least privilege, multisig | Only `PAUSER_ROLE`; `DEFAULT_ADMIN_ROLE` + `PAUSER_ROLE` to the deploy `admin` (the multisig in production — TASK-31) |
| **S10** immutable composition (I7) | `Component[]` storage is written only inside `mint`; there is no `setComposition` / `addComponent` / reweight / re-point under any role — a compile-time guarantee, covered by a transfer-survival test |
| **S9** allowlist only | `mint` accepts a component only if its `representationId` is already `ACTIVE` in `RepresentationRegistry` and resolves to the stated `assetId`; a raw address can never enter a composition |
| **S11** pausable mint | `whenNotPaused` on `mint`; pause/unpause behind `PAUSER_ROLE`; runbook is a TASK-40 gate |
| **S12** no custody | The contract holds no user tokens or ETH; NFFC transfers are standard ERC-721 safe-transfer |
| **S14** pinned pragma | `0.8.34` for `NFFC.sol`; `^0.8.20` for `INFFC.sol` (interface) |
| Segment / rarity not caller-set | Segment is computed in `mint` from registry-resolved asset classes; `staticRarity` is a fixed `0` hook — neither is a `MintParams` field |
| Threat-model seeds (`§3` "Mint") | Invariant-bypass, fee underpayment, `INACTIVE`-at-mint, segment manipulation via crafted params — each has an explicit test. Recorded for the TASK-32 threat model |

## PERFORMANCE

`mint` is `O(n)` with `n ≤ 20`: one component loop with a nested duplicate scan (≤ 190
comparisons) and ≤ 3 external `staticcall`s per component (`isActiveRepresentation`, `resolvesTo`,
`getAssetIdentity`). Composition storage is `n` `push`es. All bounded by `MAX_COMPONENTS`.

## KNOWN ISSUES

1. **`getStaticRarity` returns `0`.** It is a `virtual` TASK-14 hook; the real formula (composition
   concentration) and any storage it needs land there.
2. **`collectionId` is recorded, not validated.** Collection existence / ownership / the creation
   fee are TASK-10; `mint` only stores and emits the id.
3. **Mint fee not wired.** `mint` is `payable` and rejects non-zero value until `IFeeConfig`
   (TASK-30) supplies the fee curve and routing.
4. **`INFFC.CompositionIsImmutable` is unreachable.** The spec (`04-contract-interfaces.md` §4)
   lists the I7 error, but the same section states there is intentionally no mutator — so a
   faithful implementation can never revert with it. Kept in the interface for surface parity;
   flagged here per the "document, don't unilaterally fix governance-doc inconsistencies" rule.
5. **Asset-identity deactivation after rep registration.** I5 requires the *representation* to be
   `ACTIVE`, not its underlying Asset Identity. An NFFC can therefore be minted with a component
   whose `assetId` was set `INACTIVE` after that representation was registered (the registry keeps
   the representation `ACTIVE` until an adapter/admin flips it). Consistent with I1–I8 as written;
   recorded for the TASK-32 threat model.
6. Carried: PR stack (TASK-00…08 + `chore/bump-node-22-12`) is unmerged; this branch stacks on it.

## ACCEPTANCE CRITERIA

`NFFC_Development_Plan.md` v3.2 TASK-09:

| Criterion | Status | Evidence |
|---|---|---|
| `NFFC.sol` with rules: 1–20 components, Σ exactly 10 000 BPS, no duplicates, weight > 0, registered active asset (any provider), composition immutable post-mint | Met | `mint` enforces I1–I7; `contracts/NFFC.sol` |
| Exhaustive tests of every validation rule, incl. edge cases (1 component, 20 components, Σ ≠ 10 000, mixed providers) | Met | `contracts/NFFC.t.sol` — 31 tests incl. `test_mint_oneComponent`, `test_mint_twentyComponents`, `test_mint_weightSum{Below,Above}_reverts`, `test_segment_mixed`, 2 fuzz tests |
| No method modifies the composition after mint, under any role | Met | No mutator exists (compile-time); `test_composition_survivesTransfer_andHasNoMutator` |
| Complete events for every mint | Met | `NFFCMinted` + `NFFCCompositionRecorded`; asserted in `test_mint_happyPath` |

## PULL REQUEST

Branch `task/TASK-09-nffc-contract`, based on **`chore/bump-node-22-12`** (which stacks on
`task/TASK-08-composition-segmentation`; TASK-00…08 + the Node bump are not yet merged).

**PR: https://github.com/victorhmlz/nffc-protocol/pull/11** — base `chore/bump-node-22-12`.

**Do not merge** — Project Lead reviews and authorizes. Merge order: #1 → … → #9 → #10 (chore)
→ this PR.

## NEXT TASK

**TASK-10 — Collection Contract / Model** (`NFFC_Development_Plan.md` v3.2): `Collection.sol`,
creation-fee logic driven by component count, creator ownership. Depends on TASK-09. Blocked until
the Project Lead merges this PR and authorizes TASK-10.
