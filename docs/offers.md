# Offers (TASK-29)

"Crear, aceptar, cancelar, expiración de ofertas" (`NFFC_Development_Plan.md` v3.4 TASK-29).
Depends on TASK-19 (Marketplace Contract) and TASK-24 (Indexer), both merged. Extends
`/nffc/[tokenId]`'s existing `OffersList` (TASK-21) — no new route.

## Acceptance

> Ofertas expiradas no son aceptables on-chain aunque la UI no se haya refrescado.

**Already met by `Marketplace.sol` (TASK-19), not by anything new in this TASK.**
`acceptOffer(offerId)` reverts with `OfferExpired` when `block.timestamp > o.expiry` —
`contracts/Marketplace.t.sol`'s `test_acceptOffer_expired_reverts` (and
`test_acceptOffer_atExpiryTimestamp_stillAcceptable`, proving the boundary is inclusive) already
cover this at the contract layer, unchanged by TASK-29. This TASK's job was building the UI
around that existing guarantee — every offer action here calls the real contract function and
respects whatever it decides; nothing in this codebase second-guesses or bypasses the on-chain
check with client-side "is it expired" logic of its own.

## `useMarketplaceActionFlow` — generalized from TASK-20's `useBuyFlow`

`src/lib/marketplace/use-marketplace-action-flow.ts`. TASK-20's `useBuyFlow` was already generic
in every way that mattered (a `simulate` → `buildCall` pre-flight outside TASK-16's
`transactionFlowReducer`, so a simulation failure surfaces before any signature is requested) — it
just had "buy"-specific parameter and method names. Offers need the exact same shape three more
times (create, cancel, accept), so the hook was renamed and generalized rather than copied a
fourth time; `BuyButton`'s one call site was updated to match, with no behavior change (its own
test suite is unchanged and still green).

## UI (`src/components/nffc/`)

- **`MakeOfferForm`** — price (ETH) + expiry (a duration select: 1/3/7/30 days, converted to a
  unix-seconds `expiry` at submit time — `Marketplace.sol.createOffer(tokenId, expiry)` is
  `payable`, so price is `msg.value`, not a separate argument). Always visible on the NFFC detail
  page, regardless of connection state — the same "wallet only matters at execute time" pattern
  `BuyButton` already uses.
- **`OfferRowActions`** — one row's action, decided by the *connected* wallet against that row's
  `buyerAddress` and the page's `ownerAddress`: the offer's own buyer sees **Cancel**; the NFFC's
  current owner sees **Accept**; anyone else (including a disconnected visitor) sees nothing. The
  table itself stays visible to everyone — viewing offers needs no wallet
  (`docs/spec/07-ux-map.md`).
- **`OffersList`** (TASK-21, extended) — gained `tokenId`/`ownerAddress` props to wire the two
  components above; its own read-only rendering (buyer/price/expiry columns) is unchanged.

Every action fixture (`simulateMakeOfferFixture`, `simulateCancelOfferFixture`,
`simulateAcceptOfferFixture`) rejects with an honest "Marketplace is not deployed yet (TASK-31)"
until then — the same live-provable "the wallet is never engaged" property `BuyButton`/`useMintFlow`
already established, extended to three more actions.

## What's still deferred

- No live contract — same blocker (TASK-31) every marketplace-write surface in this codebase
  shares.
- No UI-side "this offer looks expired" indicator ahead of a failed on-chain attempt — not
  required by the acceptance criterion (which is about the chain being authoritative, not about
  the UI's freshness), and inventing one risks the UI silently disagreeing with the chain about
  what "expired" means at the exact boundary block.
