# TASK 30 REPORT

## STATUS

COMPLETED

`pnpm contracts:build` / `pnpm contracts:test` green — **211 Solidity tests** (172 → +39: 33 new
in `FeeConfig.t.sol`, 6 new in `NFFC.t.sol`'s fee-gate coverage). `pnpm verify` (lint · typecheck ·
test · build, the TypeScript/Next.js side) is **unchanged** at 86 files / 463 tests — this TASK
touches no `.ts`/`.tsx` file, matching its own acceptance criterion literally. Both CI jobs on
PR #37 pass — run `34664716034`. See PULL REQUEST.

## OBJECTIVE

"Centralizar collection fee, mint fee, marketplace fee, royalty en un único punto de configuración
administrable sin tocar el frontend" (`NFFC_Development_Plan.md` v3.4 TASK-30).

## ISSUE #3 — EXPLICIT PRONOUNCEMENT (per the Project Lead's condition on this block authorization)

**Resolved, not left as-is, and not merely re-documented a third time.**

Issue #3 (logged at TASK-19, named TASK-30 as its own "possible resolution" point) described:
`Marketplace._settle` calls `Collection.ownerOfCollection(collectionId)` only when a nonzero
royalty is configured for that collection; `NFFC.sol` never validated `collectionId` against a
real `Collection`; so a `collectionId` that was never created, but somehow acquired a nonzero
royalty, would make every sale of any NFFC minted with that id revert with `UnknownCollection`.

**The fix:** `ICollection` gained `collectionExists(uint256) returns (bool)` (additive — it already
existed as a concrete function on `Collection.sol`, just never promoted to the interface).
`FeeConfig.setRoyaltyBps` (the new concrete `IFeeConfig`, this TASK's own deliverable) now requires
`collection.collectionExists(collectionId)` before accepting **any** royalty value — zero or
nonzero — for that id. A royalty can therefore never be configured for a collection that doesn't
exist, so `_settle`'s `ownerOfCollection` call can never encounter an `UnknownCollection` collection
for a token carrying a nonzero royalty. `contracts/FeeConfig.t.sol`'s
`test_setRoyaltyBps_neverAccidentallyConfigurableForNonexistentCollection` proves the exact scenario
Issue #3 described directly, not just asserts the fix in the abstract.

**Why this is genuinely in TASK-30's scope, not a reach:** `NFFC_Development_Plan.md`'s TASK-30
entry already lists `Depende de: TASK-10` (`Collection.sol`) — until this fix, nothing in
`FeeConfig`'s design actually needed that dependency; the royalty-existence check is the reason
the plan already declared it. Fixing this at the `FeeConfig.setRoyaltyBps` layer, rather than by
having `NFFC.mint()` validate `collectionId` against `Collection.sol` (the other possible fix
point), keeps the change local to this TASK's own new contract instead of touching `NFFC.sol`'s
core minting invariants and the ~30 pre-existing `NFFC.t.sol` tests that construct mints without
any `Collection.sol` involved at all.

**What's explicitly *not* fixed, and why that's acceptable:** `NFFC_Development_Plan.md`'s TASK-19
entry still doesn't formally list TASK-10 as a dependency — the other half of Issue #3's original
observation. That's a planning-document line in one of the four Project-Lead-owned governance
documents (`NFFC_Development_Plan.md`); correcting it isn't this session's call to make
unilaterally, the same standing constraint that's applied to every prior interaction with these
four documents. The runtime risk the missing declaration pointed at is closed regardless of
whether that line ever gets corrected.

**Introduces one new, narrow constraint, disclosed rather than hidden:** `FeeConfig.collection` is
deliberately *not* `immutable` (unlike every other cross-contract reference in this codebase) —
`FeeConfig` and `Collection.sol` each need the other's address at construction, a genuine cycle
neither side can resolve alone. It's wired post-deployment via one `FEE_ADMIN_ROLE`-gated
`setCollection` call; until then, `setRoyaltyBps` fails closed (refuses every call) rather than
silently skipping the check. See CHANGES and `docs/fee-engine.md`.

## SCOPE NOTE

TASK-30 depends on TASK-10 (Collection Contract) and TASK-19 (Marketplace Contract), both merged.
Fourth and final TASK in the Project Lead's block authorization (TASK-27–30), chained on TASK-29's
merged PR.

`IFeeConfig` (the interface) and `Collection.sol`/`Marketplace.sol` consuming it were already
built (TASK-10/19) — this project's forward-dependency pattern applied to the fee model itself.
Two real gaps remained, both explicitly flagged in existing code comments as TASK-30's job: no
concrete `IFeeConfig` implementation existed (only the interface + a fully-open test double), and
`NFFC.sol`'s mint fee was never wired (`mint()` required `msg.value == 0` unconditionally). Both
are this TASK's real deliverable. Full detail: `docs/fee-engine.md`.

## CHANGES

### `contracts/FeeConfig.sol` (new) — the concrete `IFeeConfig`

- **Curve: affine**, `base + slope * (n - 1)`, chosen and justified (monotonic by construction,
  cheapest to store/read, matches the encoding `MockFeeConfig` already assumed since TASK-10/19)
  over the spec's other two candidate forms (stepped table, piecewise).
- **Hard caps**, `constant`, never admin-settable: `MAX_CURVE_FEE_AT_MAX_N` (1 ether, bounds
  `base + slope * 19` for both curves), `MAX_MARKETPLACE_FEE_BPS` / `MAX_ROYALTY_BPS` (1000 bps
  each).
- `FEE_ADMIN_ROLE` (`AccessControl`) gates every setter; every setter emits `IFeeConfig`'s
  already-declared event.
- `setRoyaltyBps` requires `collection.collectionExists(collectionId)` — the Issue #3 fix above.
- `collection` is a settable (not immutable) reference, wired via `setCollection` — see the
  constructor-cycle explanation above.

### `contracts/interfaces/ICollection.sol` (modified) — additive

`collectionExists(uint256) external view returns (bool)` added — already implemented on
`Collection.sol`, just not previously promoted to the interface.

### `contracts/interfaces/INFFC.sol`, `contracts/NFFC.sol` (modified)

`UnexpectedPayment` replaced with `MintFeeNotMet(uint256 provided, uint256 required)` +
`FeeTransferFailed()`. `NFFC.sol` gained an `IFeeConfig public immutable feeConfig` (4th
constructor param) and a `quoteMintFee(uint16)` view (mirrors
`ICollection.quoteCollectionCreationFee`). `mint()` now quotes `feeConfig.mintFee(n)`, requires
`msg.value == required`, and forwards the fee to `feeConfig.feeRecipient()` as an
interactions-last step — the exact pattern `Collection.sol`'s own creation fee already
established.

### `contracts/NFFC.t.sol`, `contracts/Marketplace.t.sol` (modified)

`NFFC.t.sol` gained a `MockFeeConfig` fixture kept at a **zero-fee curve** so all ~30 pre-existing
mint tests (which call `mint()` with no `{value:}`) are unaffected; six new tests use the mock's
already-unrestricted `setCurve` to test fee behavior specifically (quote correctness, underpay,
overpay, correct-fee forwarding, fee-transfer failure) plus a fourth constructor zero-address case
(`feeConfig`). `Marketplace.t.sol` needed only a one-line reorder + the new constructor argument,
reusing its own already-zero-fee `fees` fixture.

### `contracts/FeeConfig.t.sol` (new)

33 tests: construction (zero-address/over-cap rejections, role grants), curve correctness +
monotonicity (incl. a fuzz test), every setter's access control and cap enforcement, the
royalty/collection-existence behavior (5 tests, including the Issue #3 scenario directly), and
`setCollection`.

### Docs

`docs/fee-engine.md` (new). `docs/spec/06-fee-model.md` — fills in the curve-form decision, hard
caps, the buyer/seller split ratification, the royalty-existence rule, and the deployment-order
note. `docs/OPEN_ISSUES.md` — Issue #3 deleted (resolved, per the doc's own rule: deleted, not
marked). `docs/marketplace.md`, `docs/create-wizard.md`, `docs/mint-flow.md` — updated stale
forward-references now that TASK-30 has landed. `README.md` — status line, doc link.

## FILES CREATED

```
contracts/FeeConfig.sol
contracts/FeeConfig.t.sol
docs/fee-engine.md
docs/reports/TASK-30-REPORT.md
```

## FILES MODIFIED

```
contracts/interfaces/ICollection.sol    + collectionExists (additive)
contracts/Collection.sol                collectionExists gains `override`
contracts/interfaces/INFFC.sol          UnexpectedPayment -> MintFeeNotMet + FeeTransferFailed;
                                         + quoteMintFee
contracts/NFFC.sol                      + feeConfig (4th constructor param), mint() fee gate +
                                         forward, + quoteMintFee view
contracts/NFFC.t.sol                    + MockFeeConfig/RejectEther fixtures, updated constructor
                                         calls (4 sites) + test_mint_withValue_reverts, + 6 tests
contracts/Marketplace.t.sol             reordered fees/nffc construction, + feeConfig ctor arg
docs/spec/06-fee-model.md               curve form, hard caps, split ratification, royalty rule,
                                         deployment order
docs/OPEN_ISSUES.md                     − Issue #3 (resolved)
docs/marketplace.md                     stale TASK-30-forward-reference updates
docs/create-wizard.md                   stale TASK-30-forward-reference update
docs/mint-flow.md                       stale TASK-30-forward-reference update
README.md                               status line + doc link
```

Branch is based on `main` (TASK-00…29) — see PULL REQUEST.

## TESTS

`pnpm contracts:test` → **211 Solidity tests** (39 new):

```
contracts/FeeConfig.t.sol (33)   construction (6): zero admin/feeRecipient, curve/marketplace-fee
                                  over-cap rejected, role grants; curves (6): affine correctness,
                                  zero/too-many-components reverts, monotonic fuzz; access control
                                  (6): every setter FEE_ADMIN_ROLE-gated; fee admin (8): curve/
                                  marketplace-fee/recipient updates + their own cap/zero-address
                                  reverts, "no redeploy" quote-reflects-change; royalty (5):
                                  succeeds for a real collection, reverts for an unknown one and
                                  over-cap, the Issue #3 scenario directly, reverts before
                                  setCollection is ever called; setCollection (2): zero-address
                                  reverts, emits event
contracts/NFFC.t.sol (+6)        constructor rejects zero feeConfig; quoteMintFee matches
                                  FeeConfig; mint underpay/overpay revert with MintFeeNotMet;
                                  correct fee forwards to the recipient; fee-transfer failure
                                  reverts (RejectEther sink)
```

`pnpm run test` (TypeScript) → **86 files, 463 tests**, unchanged — confirmed zero incidental
impact on the frontend, matching this TASK's own acceptance criterion.

## BUILD

`pnpm contracts:build` green. `pnpm run build` (Next.js) green, **16 routes**, unchanged.

## LINT / TYPECHECK

Solidity: one `Function state mutability can be restricted to view` warning, fixed
(`test_constructor_grantsRolesToAdmin` marked `view`). TypeScript `pnpm run lint` /
`pnpm run typecheck`: clean, unchanged (no `.ts`/`.tsx` touched).

## SECURITY

STEP 5 AUDIT (`docs/spec/08-security-principles.md`):

| Concern | This TASK |
|---|---|
| **Cambiar cualquier fee es una operación administrativa, nunca un deploy de frontend** (acceptance) | Every fee is a live `FeeConfig` read by `Collection.sol`/`NFFC.sol`/`Marketplace.sol`; changing one is a single `FEE_ADMIN_ROLE` transaction — no contract or frontend redeploy, by construction |
| Hard caps are not admin-settable | `MAX_CURVE_FEE_AT_MAX_N`/`MAX_MARKETPLACE_FEE_BPS`/`MAX_ROYALTY_BPS` are `constant`; every setter checks against them before writing, both at construction and on every subsequent change |
| Royalty can never target a nonexistent collection (resolves former Issue #3) | `setRoyaltyBps` requires `collection.collectionExists`, proven directly by a dedicated test reproducing the exact original failure scenario |
| Fee-forward follows checks-effects-interactions | `NFFC.mint()`'s fee transfer happens after all storage writes/events, guarded by the pre-existing `nonReentrant` modifier — the identical pattern `Collection.sol`'s creation fee already uses |
| `FeeConfig.setCollection` fails closed before being called | `setRoyaltyBps` explicitly checks `address(collection) == address(0)` and refuses rather than skipping the existence check |
| No real network/database in Solidity tests | All Foundry-style `forge-std` unit tests, no external dependency, matching every other contract test in this codebase |

## PERFORMANCE

`_curve` is `O(1)` (two `SLOAD`s + arithmetic). `mint()`'s added fee-quote + fee-forward is one
extra external view call (`feeConfig.mintFee`) and, when the fee is nonzero, one extra `.call` —
the same cost `Collection.sol`'s creation fee already carries, not a new pattern.

## KNOWN ISSUES

1. **The `FeeConfig` ↔ `Collection` deployment order has one extra step** (`setCollection`) beyond
   a simple "deploy everything once" sequence — documented in `docs/fee-engine.md` and this
   contract's own header comment; a real deployment runbook (TASK-31) needs to follow it in order.
   Not logged as an open issue — it's a documented operational step, not an unresolved risk.
2. **No live deployment** — same TASK-31 blocker every contract in this codebase shares.
3. **The frontend fee preview isn't wired to a real `FeeConfig`** — `src/app/create/page.tsx`'s
   `quoteFees` fixture is unchanged; wiring it needs TASK-31's deployed address, which is exactly
   why this TASK correctly touches zero TypeScript files (see SCOPE NOTE / acceptance criterion).

## ACCEPTANCE CRITERIA

`NFFC_Development_Plan.md` v3.4 TASK-30:

| Criterion | Status | Evidence |
|---|---|---|
| Cambiar cualquier fee es una operación administrativa, nunca un deploy de frontend | Met | Every fee is a `FeeConfig` read, changeable via one `FEE_ADMIN_ROLE` transaction; `pnpm verify` (TypeScript) unchanged at 86 files/463 tests proves no frontend deploy was needed to build this TASK, let alone to change a fee value |

## PULL REQUEST

Branch `task/TASK-30-fee-engine`, based on **`main`** (TASK-00…29).

**PR: https://github.com/victorhmlz/nffc-protocol/pull/37** — base `main`.
**CI: https://github.com/victorhmlz/nffc-protocol/actions/runs/34664716034 — success** — both jobs.

**Do not merge** — Project Lead reviews and authorizes.

## NEXT TASK

This completes the Project Lead's TASK-27–30 block authorization. **TASK-31 — Admin**
(`NFFC_Development_Plan.md` v3.4, depende de TASK-05, TASK-30) is next per the plan's ordering, but
per the standing rule this session has followed throughout, it is not started without an explicit
new authorization from the Project Lead.
