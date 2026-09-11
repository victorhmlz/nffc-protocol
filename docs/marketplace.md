# Marketplace (TASK-19)

`Marketplace.sol` — list, cancel, buy, and offer on NFFCs (`docs/spec/04-contract-interfaces.md`
§6, `IMarketplace`). Depends on TASK-09 (`NFFC.sol`); reads fees and royalties from `IFeeConfig`
(TASK-10's interface, TASK-30's future implementation — `MockFeeConfig` stands in until then) and
resolves royalty recipients via `ICollection` (TASK-10, already merged).

## Acceptance criteria (`NFFC_Development_Plan.md` v3.2)

- **Reentrancy protection verified with dedicated tests** on every value-moving path.
- **Cancelling another seller's listing is impossible, under any tested condition.**

## Listings are escrow-free; offers are escrowed

A listing only records intent — seller and price. The NFT stays with the seller (approved to the
marketplace) until {buy} moves it and settles funds in the same transaction; nothing but that one
call ever holds the token. An offer is different: {createOffer} escrows `msg.value` in the
contract, refunded in full on {cancelOffer} or paid out (split) on {acceptOffer}. This mirrors the
spec's own `Listing` (no escrowed field) vs. `Offer` (`price` is the escrowed amount) shape.

## Every value-moving path is `nonReentrant`, and CEI throughout

`buy`, `acceptOffer`, and `cancelOffer` are all `nonReentrant`. Each flips its `active` flag(s) to
closed *before* any external call, so a reentrant call always sees the listing/offer already
closed — checks-effects-interactions, not just the guard, per `docs/spec/08-security-principles.md`
S4/S5. `createListing` and `cancelListing` touch no balance and carry no guard; `cancelListing` and
`cancelOffer` are also deliberately **not** `whenNotPaused` — a pause stops new listings, offers,
and sales, never a user's ability to withdraw one already open (no pause can strand funds or a
listing).

`Marketplace.t.sol` proves the guard four ways, using a generic `ReenterOnReceiveMarketplace` test
double (mirroring `Collection.t.sol`'s `ReenterOnReceive`, generalized past one call site):

1. The marketplace-fee recipient re-enters `buy` on a second listing from `buy`'s fee payout.
2. A contract buyer re-enters `buy` on a second listing from inside `onERC721Received` — the
   `safeTransferFrom` receiver hook fires *before* any payout, and is blocked by the same lock.
3. The seller re-enters `cancelOffer` on a different, still-active offer from `acceptOffer`'s
   proceeds payout.
4. The offer buyer re-enters `buy` on an active listing from `cancelOffer`'s refund.

## Fee + royalty split, read from `IFeeConfig` at settlement time

`_settle` computes `fee = price * marketplaceFeeBps() / 10_000` and
`royalty = price * royaltyBps(collectionId) / 10_000`, moves the NFT via `safeTransferFrom` (S12 —
NFFC transfers must follow ERC-721 safe-transfer semantics; the marketplace never reimplements
`transferFrom`'s or `safeTransferFrom`'s own approval/ownership checks, S1), then pays fee →
royalty → seller proceeds, each an independent `.call`, each required to succeed
(`Marketplace.FeeTransferFailed` otherwise) — one recipient rejecting ETH (or a blocked reentrant
call) fails the whole settlement rather than silently dropping funds.

**Buyer pays exactly the listing/offer price; fee and royalty come out of the seller's proceeds.**
`docs/spec/06-fee-model.md` §1 leaves the marketplace-fee buyer/seller split `// OPEN`, a TASK-30
decision — this is TASK-19's provisional choice, kept because it makes `buy`/`acceptOffer` a
single-amount call the UI can preview exactly (`price`), with no separate "plus fee" line the buyer
has to compute. Revisiting the split is TASK-30 scope, not a `Marketplace.sol` change.

**V1 enforces royalties on this native marketplace only** (`docs/spec/06-fee-model.md` §3's
TASK-19/TASK-30 decision) — external venues are not assumed to honor them, and this contract
advertises nothing via EIP-2981. The royalty recipient is the collection's creator
(`ICollection.ownerOfCollection`), resolved only when `royaltyBps(collectionId) != 0` — see
`docs/OPEN_ISSUES.md` Issue #3 for the edge case this leaves open.

## `getCollectionId` — the one addition to `INFFC` (TASK-09's interface)

Resolving a royalty recipient needs the token's `collectionId`, which `NFFC.sol` already stores and
exposed as a concrete function (`getCollectionId`) but never added to `INFFC`. TASK-19 adds it to
the interface (purely additive — `NFFC.sol`'s existing implementation now carries `override`)
rather than having `Marketplace.sol` depend on the concrete `NFFC` contract instead of its
interface, following the same "interfaces first" convention `Collection.sol` and `NFFC.sol`
themselves use for `IFeeConfig`.

## What's still a fixture

`Marketplace.t.sol` uses `MockFeeConfig` (the same test double from TASK-10) for
`marketplaceFeeBps` / `royaltyBps` / `feeRecipient` — `FeeConfig.sol` itself is TASK-30. There is no
deployed address for any of this yet (TASK-31).
