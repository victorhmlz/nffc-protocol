# Fee Engine (TASK-30)

"Centralizar collection fee, mint fee, marketplace fee, royalty en un único punto de configuración
administrable sin tocar el frontend" (`NFFC_Development_Plan.md` v3.4 TASK-30). Depends on TASK-10
(Collection Contract) and TASK-19 (Marketplace Contract), both merged. Purely a contracts-side
TASK — zero TypeScript/UI changes (see SCOPE NOTE below for why that's the correct outcome, not
an oversight).

## Acceptance

> Cambiar cualquier fee es una operación administrativa, nunca un deploy de frontend.

Met by construction: every one of the four fees is a value read from `FeeConfig` at call time by
`Collection.sol`, `NFFC.sol`, and `Marketplace.sol` — none of them hardcode an amount, and the
frontend (once wired, TASK-31) reads the same live values via RPC. Changing any fee is one
`FEE_ADMIN_ROLE` transaction to `FeeConfig`; nothing else redeploys.

## What already existed vs. what TASK-30 built

`IFeeConfig` (the interface), and `Collection.sol` / `Marketplace.sol` consuming it for the
creation fee and the marketplace fee + royalty, were already built and merged (TASK-10/19) — this
project's forward-dependency pattern applied to the fee model itself. Two real gaps remained,
explicitly called out in `NFFC.sol`'s own comments ("routing lands with `IFeeConfig` (TASK-30)")
and in `docs/spec/06-fee-model.md` ("decided in TASK-30"):

1. **No concrete `IFeeConfig` implementation existed** — only the interface and a fully-open test
   double (`contracts/mocks/MockFeeConfig.sol`).
2. **`NFFC.sol`'s mint fee was never wired** — `mint()` was `payable` but required `msg.value == 0`
   unconditionally.

Both are TASK-30's real deliverable: `contracts/FeeConfig.sol` (new) and `NFFC.sol`'s mint-fee
integration (modified).

## `FeeConfig.sol` — the concrete `IFeeConfig`

- **Curve form: affine**, `base + slope * (n - 1)`, for both `collectionCreationFee` and
  `mintFee`. Chosen over a stepped table or piecewise curve — monotonic by construction (no
  negative `uint256`), cheapest to store/read, and nothing in the fee model spec asks for a
  piecewise curve's extra flexibility. `MockFeeConfig` (already relied on by `Collection.t.sol` /
  `Marketplace.t.sol` since TASK-10/19) already assumed exactly this form.
- **Hard caps**, `constant`/never admin-settable: `MAX_CURVE_FEE_AT_MAX_N` (1 ether — bounds
  `base + slope * 19` for both curves), `MAX_MARKETPLACE_FEE_BPS` (1000 = 10%),
  `MAX_ROYALTY_BPS` (1000 = 10%). A misconfigured or compromised `FEE_ADMIN_ROLE` transaction can
  set a fee anywhere within these ceilings, never above them.
- **`FEE_ADMIN_ROLE`** (`AccessControl`) gates every setter; every setter emits the event
  `IFeeConfig` already declares.
- **`collectionCreationFee(n)` / `mintFee(n)`** revert for `n == 0` or `n > 20` — the same `1..20`
  bound `NFFC.sol` (I1) and `Collection.sol` already enforce elsewhere.

Full test suite: `contracts/FeeConfig.t.sol`, 33 tests — construction, curve correctness and
monotonicity (incl. a fuzz test), every setter's access control and cap enforcement, and the
royalty/collection-existence behavior below.

## Resolves `docs/OPEN_ISSUES.md`'s former Issue #3

Issue #3 (logged in TASK-19) flagged that `Marketplace._settle` calls
`Collection.ownerOfCollection(collectionId)` only when a royalty is configured, and that
`NFFC.sol` never validates `collectionId` against a real collection — so a `collectionId` that was
never created, but somehow acquired a nonzero royalty, would make `_settle` revert with
`UnknownCollection` for every sale of any NFFC minted with that id. The issue's own "possible
resolution" line named TASK-30 for exactly this reason (TASK-30 already lists
`Depende de: TASK-10`).

**Resolved, not just re-documented:** `FeeConfig.setRoyaltyBps` now requires
`ICollection.collectionExists(collectionId)` (added to `ICollection`, additive) before accepting a
nonzero — or any — royalty for that id. A royalty can only ever be configured for a collection
that genuinely exists, so `_settle`'s `ownerOfCollection` call can never encounter an
`UnknownCollection` collection for a token that has a nonzero royalty. The Development Plan's
TASK-19 entry still doesn't formally list TASK-10 as a dependency — a cosmetic planning-doc note,
not something to correct unilaterally (`NFFC_Development_Plan.md` is the Project Lead's document)
— but the actual runtime risk Issue #3 described is closed.

`contracts/FeeConfig.t.sol`'s `test_setRoyaltyBps_neverAccidentallyConfigurableForNonexistentCollection`
proves the exact scenario Issue #3 described directly.

## The `FeeConfig` ↔ `Collection` constructor cycle

`FeeConfig.setRoyaltyBps` needs `Collection.sol`'s address; `Collection.sol`'s constructor needs
`FeeConfig`'s address (for the creation fee) — neither can be the other's constructor argument.
`collection` on `FeeConfig` is deliberately **not** `immutable` (the only non-immutable
cross-contract reference in this codebase) — it's wired post-deployment via
`FeeConfig.setCollection(address)`, `FEE_ADMIN_ROLE`-gated. Deployment order:

1. `FeeConfig` (with `collection` unset)
2. `Collection` (passing `FeeConfig`'s real address)
3. `FEE_ADMIN_ROLE` calls `FeeConfig.setCollection(address(collection))` — until this, every
   `setRoyaltyBps` call reverts (fail-closed, not silently permissive)
4. `NFFC.sol`, then `Marketplace.sol`, as before

## `NFFC.sol`'s mint fee

Mirrors `Collection.sol`'s own creation-fee pattern exactly: `mint()` quotes
`feeConfig.mintFee(n)`, requires `msg.value == required` (`MintFeeNotMet` otherwise, replacing the
old unconditional `UnexpectedPayment`), and forwards the fee to `feeConfig.feeRecipient()` as an
interactions-last step (checks-effects-interactions, same `nonReentrant` guard as before). A new
`quoteMintFee(uint16)` view on `INFFC` mirrors `ICollection.quoteCollectionCreationFee`, so a
future frontend can show the exact fee before signing (`docs/spec/06-fee-model.md` §5,
TASK-17's already-built fee-preview step — wiring the *real* number in is still gated on TASK-31's
deploy, unchanged by this TASK).

**Test-suite impact**: `NFFC.t.sol`'s shared `MockFeeConfig` fixture stays at a zero-fee curve
(`base: 0, slope: 0`), so all ~30 pre-existing mint tests (which call `mint()` with no `{value:}`)
are unaffected. Six new tests use `fees.setCurve(...)` (already an unrestricted method on the
existing mock) to configure a nonzero fee just for themselves: quote correctness, underpay/overpay
reverts, correct-fee forwarding, fee-transfer failure, and a fourth constructor zero-address case
(`feeConfig`). `Marketplace.t.sol`'s own `NFFC` construction (already at zero fees via its own
`fees` fixture) needed only a one-line update (the new constructor argument, reusing the fixture
already there).

## Marketplace fee / royalty split — ratified, not re-litigated

`docs/spec/06-fee-model.md` §3 left "Paid by: Buyer/seller split per TASK-30 decision" open.
`Marketplace.sol`'s `_settle` (TASK-19, already merged and tested) already deducts the fee and
royalty from the seller's proceeds — the buyer pays exactly the listed/offered price, no markup.
**TASK-30 ratifies this as the decision** rather than changing already-working, already-tested
settlement math for no functional reason: it's the standard model most NFT marketplaces use, and
nothing in the fee model spec required the alternative (a buyer-side markup).

## Why this TASK has no frontend/TypeScript changes

The objective's own wording — "sin tocar el frontend" — is the acceptance criterion, not an
afterthought: every fee value the frontend would ever show is already meant to come from a live
RPC read against `IFeeConfig`, never a hardcoded constant. The current frontend
(`src/app/create/page.tsx`'s `quoteFees` fixture) is *already* a stand-in for that read, unchanged
since TASK-17/18 — wiring it to the real, now-existing `FeeConfig.sol` is TASK-31's deploy-time
job, not this TASK's. `pnpm verify` (lint/typecheck/test/build) is unchanged at 86 files / 463
tests, confirming zero incidental TypeScript impact.

## What's still deferred

- No live deployment — same TASK-31 blocker every contract in this codebase shares; the two-step
  `FeeConfig` ↔ `Collection` wiring above is a deployment-runbook concern for that TASK.
- The frontend fee preview isn't wired to a real `FeeConfig` yet — needs TASK-31's deployed
  address, not a code change here.
