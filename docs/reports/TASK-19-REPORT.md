# TASK 19 REPORT

## STATUS

COMPLETED

`pnpm verify` (lint · typecheck · test · build) green locally — TypeScript surface unchanged
(TASK-19 is Solidity-only): **40 files, 213 tests**, same as TASK-18. `pnpm contracts:build` /
`pnpm contracts:test` green — **172 Solidity tests** (128 → +44). Both CI jobs on PR #23 pass —
run `34592973460`. See PULL REQUEST.

## OBJECTIVE

List, cancel, buy, and make offers on NFFCs, with configurable fees
(`NFFC_Development_Plan.md` v3.2 TASK-19; `docs/spec/04-contract-interfaces.md` §6 `IMarketplace`).

## SCOPE NOTE

TASK-19 depends on TASK-09 (`NFFC.sol`) only, per the Development Plan. In practice, resolving a
royalty recipient also needs `Collection.sol` (TASK-10, already merged) — a real operational
dependency not listed as a formal blocker; recorded as `docs/OPEN_ISSUES.md` Issue #3 rather than
silently added to the dependency graph after the fact. `IFeeConfig`'s concrete implementation
(`FeeConfig.sol`) is TASK-30 — `Marketplace.sol` reads it purely through the TASK-10 interface,
using `MockFeeConfig` (the same test double `Collection.t.sol` already uses) until then.

`docs/spec/06-fee-model.md` §3 explicitly leaves two decisions to "TASK-19/TASK-30": whether V1
enforces royalties on the native marketplace only, and how the marketplace fee splits between
buyer and seller. TASK-19 makes the first decision now (native-only enforcement, no EIP-2981
advertisement) and defers the second (buyer pays exactly the listing/offer price; fee and royalty
both come out of the seller's proceeds) as a documented provisional choice — see CHANGES and
`docs/marketplace.md`.

## CHANGES

### `contracts/interfaces/IMarketplace.sol` (new) — the exact spec surface, plus a few additions

Mirrors `docs/spec/04-contract-interfaces.md` §6 verbatim (`Listing`, `Offer`, the six functions,
the six spec-listed errors). `Marketplace.sol` adds three errors the spec's minimal list didn't
enumerate — `ZeroAddress` (constructor validation, matching `Collection.sol`/`NFFC.sol`),
`NotOfferBuyer` (a non-buyer cannot cancel someone else's offer — the spec names the listing
equivalent, `CannotCancelOthersListing`, but not this one), and `FeeTransferFailed` (a failed
payout reverts the whole settlement rather than silently dropping funds, matching
`ICollection.FeeTransferFailed`'s precedent).

### `contracts/interfaces/INFFC.sol` (modified) — one additive function

Adds `getCollectionId(uint256) → uint256` to the interface — `NFFC.sol` (TASK-09) already
implemented this as a concrete, non-interface function; `Marketplace.sol` needs it (via `INFFC`,
not the concrete type) to resolve royalty recipients. Purely additive; `NFFC.sol`'s existing
implementation now carries `override`, no other behavior changes anywhere in TASK-09's surface.

### `contracts/Marketplace.sol` (new)

Implements `IMarketplace` with `AccessControl` (`PAUSER_ROLE`), `Pausable`, `ReentrancyGuard`.
Listings are escrow-free (only seller + price are recorded; the NFT stays with the seller,
approved to the marketplace, until `buy` moves it). Offers escrow `msg.value` in the contract,
refunded on `cancelOffer` or paid out on `acceptOffer`. `buy`, `acceptOffer`, `cancelOffer` are all
`nonReentrant` and flip their `active` flag(s) before any external call (CEI); `createListing`
touches no balance (no guard needed) and `cancelListing`/`cancelOffer` are deliberately **not**
`whenNotPaused` — a pause stops new listings/offers/sales, never a user's ability to recover a
listing or escrowed funds already open. The NFT moves via `IERC721.safeTransferFrom`
(`docs/spec/08-security-principles.md` S12 requires ERC-721 safe-transfer semantics; the receiver
hook it can trigger on a contract buyer is one more call already covered by the same
`nonReentrant` lock, proven by a dedicated test). Fee and royalty are read from `IFeeConfig` at
settlement time and paid independently (`.call`, each required to succeed) after the NFT moves.

### `contracts/mocks/MarketplaceAttackers.sol` (new) — `ReenterOnReceiveMarketplace`

A generic reentrancy attacker, mirroring `Collection.t.sol`'s `ReenterOnReceive` but generalized
past one call site: `execute` lets a test drive it through arbitrary setup (own a token, approve
the marketplace, ...); `arm` + `receive`/`onERC721Received` re-enters an arbitrary encoded call the
instant it is paid or handed an NFT, bubbling the blocked reentrant call's revert so the
marketplace's own payout/transfer call observably fails — the same mechanism
`Collection.t.sol`'s `test_create_reentrancy_blocked` established.

### `contracts/Marketplace.t.sol` (new) — 44 tests

Listings (happy path, non-owner create/cancel — including a fuzz test over arbitrary callers,
re-listing overwrites price, pause behavior); `buy` (happy path, fee+royalty split with an exact-math
test plus a fuzz test over `(feeBps, royaltyBps, price)` conserving value, price mismatch under/over,
inactive/cancelled listing, missing approval, a listing gone stale after a direct off-marketplace
transfer, paused, a rejecting fee recipient); offers (escrow, increment, cancel by buyer/non-buyer,
strict expiry enforcement — including the exact-boundary case, accepting also clears a stale
listing on the same token, not-owner, paused); four dedicated reentrancy tests covering all three
value-moving functions plus the `safeTransferFrom` receiver-hook path; constructor validation.

### `contracts/README.md`, `docs/marketplace.md`, `README.md`, `docs/OPEN_ISSUES.md`

Layout table entries for the new interface/contract/mock; `docs/marketplace.md` (new) explains the
escrow model, the reentrancy proof strategy, the fee/royalty split decision, and the `INFFC`
addition; README status line; two new Open Issues (#3, #4 — see KNOWN ISSUES).

## FILES CREATED

```
contracts/interfaces/IMarketplace.sol
contracts/Marketplace.sol
contracts/Marketplace.t.sol
contracts/mocks/MarketplaceAttackers.sol
docs/marketplace.md
docs/reports/TASK-19-REPORT.md
```

## FILES MODIFIED

```
contracts/interfaces/INFFC.sol   + getCollectionId
contracts/NFFC.sol               getCollectionId now `override`, @inheritdoc INFFC
contracts/README.md              layout table entries for IMarketplace/Marketplace.sol
README.md                        status line + doc link
docs/OPEN_ISSUES.md              + Issue #3, + Issue #4; next ID -> 5
```

Branch is based on `main` (TASK-00…18, plus the Master Prompt v2.3 / Open Issues log PR) — see
PULL REQUEST.

## TESTS

`pnpm contracts:test` → forge-std via Hardhat, **172 Solidity tests** (44 new, all in
`Marketplace.t.sol`):

```
listings (10)      happy path; not-owner create (incl. nonexistent token); relist overwrites price;
                    cancel by seller; cancel by non-seller (3 fixed callers incl. admin) + a fuzz
                    test over arbitrary callers; cancel when not active; cancel/create pause behavior
buy (13)            happy path (no fees); fee+royalty split (exact math) + a fuzz test conserving
                    value across (feeBps, royaltyBps, price); under/overpay; not active; cancelled;
                    missing approval (OZ's own error, not reimplemented); stale listing after a
                    direct off-marketplace transfer; paused; rejecting fee recipient; two reentrancy
                    tests (fee-payout leg, safeTransferFrom receiver-hook leg)
offers (16)         escrow + id increment; cancel by buyer (refund) / by non-buyer; cancel when not
                    active; cancel pause behavior; accept happy path; accept also cancels a stale
                    listing on the same token; accept by non-owner; accept expired (+ the
                    exact-boundary "still valid at expiry" case); accept when not active; accept
                    paused; two reentrancy tests (proceeds-payout leg, buyer-refund leg)
construction (4)    rejects a zero admin / nffc / collection / feeConfig address
pausing (2)         pause is PAUSER_ROLE-only; unpause restores createListing
```

`pnpm test` (TypeScript/Vitest) → unchanged, **40 files, 213 tests** — TASK-19 touches no
TypeScript.

## BUILD

`pnpm build` green — unchanged, same **8 routes** (TASK-19 is contracts-only, no frontend surface).
`pnpm contracts:build` green — 3 Solidity files compiled (the new interface, contract, and mock).

## LINT / TYPECHECK

Clean (both the JS/TS toolchain, unaffected, and `hardhat compile`, which surfaces Solidity type
errors — none).

## SECURITY

STEP 5 AUDIT (`docs/spec/08-security-principles.md`):

| Concern | This TASK |
|---|---|
| **Reentrancy protection on every value-moving path, verified by dedicated tests** (acceptance, S5) | `buy`/`acceptOffer`/`cancelOffer` are all `nonReentrant`; four dedicated tests each arm a generic attacker (`ReenterOnReceiveMarketplace`) to re-enter a *different* guarded function from a payout/refund/receiver-hook callback and assert the outer call fails and the target state is untouched |
| **Cancelling another seller's listing is impossible, under any tested condition** (acceptance) | `cancelListing` checks `l.seller == msg.sender`, reverting `CannotCancelOthersListing` otherwise; tested against three fixed callers (a stranger, the buyer, the protocol admin) plus a fuzz test over arbitrary addresses |
| **Checks-effects-interactions** (S4) | Every `active` flag flips before any external call in `buy`/`acceptOffer`/`cancelOffer`; `_settle` moves the NFT before paying out, and each payout is independent so a failure anywhere reverts the whole settlement, never a partial one |
| **ERC-721 safe-transfer semantics** (S12) | `_settle` uses `safeTransferFrom`, not `transferFrom`; the added receiver-hook reentrancy surface is covered by the same guard, proven by its own test |
| **Don't reimplement OpenZeppelin** (S1) | Approval/ownership checks are never duplicated — `safeTransferFrom`'s own `ERC721InsufficientApproval` surfaces untouched when the marketplace isn't approved |
| **Expired offers are never acceptable on-chain** (TASK-29 acceptance, tested here since the on-chain enforcement is TASK-19's surface) | `acceptOffer` checks `block.timestamp > o.expiry`, strict; tested both past expiry and at the exact boundary (still valid) |
| **Fees/royalties never hardcoded, read from `IFeeConfig` at call time** | `_settle` calls `feeConfig.marketplaceFeeBps()` / `royaltyBps(collectionId)` every settlement — a fee-admin change needs no `Marketplace.sol` redeploy |
| **Pausable guarded surfaces, without stranding funds** (S11) | `createListing`/`createOffer`/`buy`/`acceptOffer` are `whenNotPaused`; `cancelListing`/`cancelOffer` deliberately are not, so a pause can never trap a listing or an escrowed offer |
| No custom cryptography, no `tx.origin`, custom errors + complete events (S2/S3/S6) | Unchanged posture — nothing in this TASK introduces either |

Not newly applicable this TASK: S9 (allowlist-only asset registration — the marketplace lists
existing tokens, it never registers assets); S13 (on-chain source of truth — unaffected, no new
off-chain state).

## PERFORMANCE

Every marketplace function is `O(1)` — no loops over listings/offers, no unbounded arrays. `buy`
and `acceptOffer` each make one external call to `NFFC` (`ownerOf`/`safeTransferFrom`), one to
`IFeeConfig` (`marketplaceFeeBps`, and `royaltyBps` only when settling), and at most one to
`ICollection` (`ownerOfCollection`, only when `royaltyBps != 0`) — no oracle reads, no indexer
dependency.

## KNOWN ISSUES

1. **Marketplace-fee buyer/seller split is a TASK-19 provisional decision, not TASK-30's final
   one.** `docs/spec/06-fee-model.md` explicitly leaves the split `// OPEN`, assigned to TASK-30.
   TASK-19's choice — buyer pays exactly `price`, fee+royalty come out of seller proceeds — keeps
   `buy`/`acceptOffer` a single-amount call; revisiting it is TASK-30 scope, already anticipated by
   the Development Plan, so not added to `docs/OPEN_ISSUES.md`.
2. **Royalty recipient resolution depends on `Collection.sol`, not a declared TASK-19 dependency.**
   Harmless under the V1 default (`royaltyBps == 0` everywhere until configured) — logged as
   `docs/OPEN_ISSUES.md` **Issue #3** since it is a real design decision, not scope already assigned
   to a named future TASK.
3. **Front-running / MEV on listings and offers has no mitigation in V1** — an inherent risk of any
   on-chain marketplace without commit-reveal or a price-time lock, already named (without an owning
   TASK) in `docs/spec/08-security-principles.md`'s own threat table. Logged as `docs/OPEN_ISSUES.md`
   **Issue #4**.
4. **No EIP-2981 advertisement.** TASK-19 decided royalties are enforced on the native marketplace
   only; external venues have no on-chain signal of the configured royalty. A deliberate scope
   decision (see CHANGES/SCOPE NOTE), not a gap — not logged as an open issue.
5. **Offers on a token are never auto-invalidated by a sale elsewhere** (a direct transfer, or a
   `buy`/other `acceptOffer`). Each stays independently cancellable by its own buyer for a full
   refund at any time — never strands funds — but a buyer must notice and cancel manually rather
   than have it close automatically. A UX-polish item for TASK-29 (Offers UI), not a fund-safety
   issue, so not logged as an open issue.

## ACCEPTANCE CRITERIA

`NFFC_Development_Plan.md` v3.2 TASK-19:

| Criterion | Status | Evidence |
|---|---|---|
| Reentrancy protection verified with dedicated tests | Met | `nonReentrant` on `buy`/`acceptOffer`/`cancelOffer`; 4 dedicated tests in `Marketplace.t.sol` covering every value-moving leg, including the `safeTransferFrom` receiver-hook surface added by S12 compliance |
| Cancellation of a listing by a non-owner is impossible under any tested condition | Met | `cancelListing`'s `CannotCancelOthersListing` check; tested against 3 fixed callers plus a fuzz test over arbitrary addresses |

## PULL REQUEST

Branch `task/TASK-19-marketplace-contract`, based on **`main`** (TASK-00…18, plus the Master
Prompt v2.3 / Open Issues log PR).

**PR: https://github.com/victorhmlz/nffc-protocol/pull/23** — base `main`.
**CI: https://github.com/victorhmlz/nffc-protocol/actions/runs/34592973460 — success** — both jobs.

**Do not merge** — Project Lead reviews and authorizes.

## NEXT TASK

**TASK-20 — Marketplace UI** (`NFFC_Development_Plan.md` v3.2). Blocked until the Project Lead
merges this PR and authorizes TASK-20.
