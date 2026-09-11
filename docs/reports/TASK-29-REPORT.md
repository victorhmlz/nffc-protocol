# TASK 29 REPORT

## STATUS

COMPLETED

`pnpm verify` (lint · typecheck · test · build) green locally — **86 files, 463 tests** (454 → +9,
net of retiring TASK-20's `use-buy-flow.test.tsx` in favor of its generalized replacement — see
CHANGES). `pnpm contracts:build` / `pnpm contracts:test` unchanged — **172 Solidity tests**
(TASK-29 touches no `.sol` — the contract-level behavior already existed, TASK-19). Offer flows
smoke-tested live via `pnpm dev` on `/nffc/1` — see BUILD. PR not yet opened at time of writing
this section — see PULL REQUEST for the final link.

## OBJECTIVE

"Crear, aceptar, cancelar, expiración de ofertas" (`NFFC_Development_Plan.md` v3.4 TASK-29).

## SCOPE NOTE

TASK-29 depends on TASK-19 (Marketplace Contract) and TASK-24 (Indexer), both merged. Third TASK
in the Project Lead's block authorization (TASK-27–30), chained on TASK-28's merged PR.

The acceptance criterion — "Ofertas expiradas no son aceptables on-chain aunque la UI no se haya
refrescado" — is **already met by `Marketplace.sol` (TASK-19)**, not by anything new here:
`acceptOffer` reverts with `OfferExpired` when `block.timestamp > o.expiry`, already covered by
`contracts/Marketplace.t.sol`'s `test_acceptOffer_expired_reverts` /
`test_acceptOffer_atExpiryTimestamp_stillAcceptable`. TASK-29's actual job was the UI/flow layer
around that existing, strict, unmodified contract guarantee — `OffersList` (TASK-21) had
explicitly deferred exactly this: "Making an offer is a TASK-29 surface — this list is read-only
for now." Full detail: `docs/offers.md`.

## CHANGES

### `src/lib/marketplace/use-marketplace-action-flow.ts` (new) — generalizes TASK-20's `useBuyFlow`

TASK-20's `useBuyFlow` was already fully generic in behavior (a `simulate` → `buildCall` pre-flight
outside TASK-16's `transactionFlowReducer`, unmodified) — only its parameter/method names were
buy-specific. Offers need the identical shape three more times (create/cancel/accept), so the hook
was renamed and generalized (`simulateBuy`→`simulate`, `buildBuyCall`→`buildCall`, `buy()`→
`execute()`) rather than copied a fourth time. `BuyButton`'s one call site was updated to match —
its own test suite, unchanged, is still green. The old `use-buy-flow.ts` (+ its test) is retired,
not left as a second copy.

### `src/components/nffc/make-offer-form.tsx` (new) — `MakeOfferForm`

Price (ETH) + expiry (a duration select — 1/3/7/30 days — converted to a unix-seconds `expiry` at
submit time, since `Marketplace.sol.createOffer(tokenId, expiry)` is `payable`: price is
`msg.value`, not a separate argument, confirmed by reading the deployed function signature).
Always visible regardless of connection state, same as `BuyButton`.

### `src/components/nffc/offer-row-actions.tsx` (new) — `OfferRowActions`

One row's action, decided by the *connected* wallet against that row's `buyerAddress` and the
page's `ownerAddress`: the buyer sees **Cancel**; the NFFC's owner sees **Accept**; anyone else
(including disconnected) sees nothing. Both `useMarketplaceActionFlow` calls are unconditional
(React's rules of hooks) — which one is used is decided by props, not by skipping a hook call.

### `src/components/nffc/offers-list.tsx` (modified)

Gained `tokenId`/`ownerAddress` props to wire the two components above into each row + the form;
its own read-only rendering (buyer/price/expiry columns) is unchanged. Its doc comment no longer
defers to TASK-29 — it now describes what TASK-29 built.

### `src/app/nffc/[tokenId]/page.tsx` (modified)

One-line call-site update: `<OffersList tokenId={tokenId} ownerAddress={detail.ownerAddress} offers={detail.offers} />`.

### Docs

`docs/offers.md` (new). `docs/nffc-detail.md`, `docs/marketplace-ui.md` — updated the sections that
explicitly deferred offer creation to TASK-29, now that it's built. `README.md` — status line, doc
link.

## FILES CREATED

```
src/lib/marketplace/use-marketplace-action-flow.ts
src/lib/marketplace/use-marketplace-action-flow.test.tsx
src/components/nffc/make-offer-form.tsx
src/components/nffc/make-offer-form.test.tsx
src/components/nffc/offer-row-actions.tsx
src/components/nffc/offer-row-actions.test.tsx
docs/offers.md
docs/reports/TASK-29-REPORT.md
```

## FILES REMOVED

```
src/lib/marketplace/use-buy-flow.ts        superseded by use-marketplace-action-flow.ts
src/lib/marketplace/use-buy-flow.test.tsx  superseded by use-marketplace-action-flow.test.tsx
```

## FILES MODIFIED

```
src/components/market/buy-button.tsx    use useMarketplaceActionFlow instead of the retired
                                         useBuyFlow (simulate/buildCall/execute renamed to match)
src/components/nffc/offers-list.tsx     + tokenId/ownerAddress props; renders MakeOfferForm +
                                         OfferRowActions per row
src/components/nffc/offers-list.test.tsx  updated props, + 1 test
src/app/nffc/[tokenId]/page.tsx         pass tokenId/ownerAddress to OffersList
src/lib/portfolio/use-portfolio.ts      doc-comment reference update (useBuyFlow → the renamed hook)
docs/nffc-detail.md                     "Offers are read-only" section now describes what shipped
docs/marketplace-ui.md                  doc-comment + "Not in TASK-20's scope" note updated
README.md                               status line + doc link
```

Branch is based on `main` (TASK-00…28) — see PULL REQUEST.

## TESTS

`pnpm test` → Vitest, **86 files, 463 tests** (9 net new):

```
src/lib/marketplace/use-marketplace-action-flow.test.tsx (3)  simulation failure communicated
                                                    before a signature is requested (never calls
                                                    buildCall); isSimulating shown then cleared;
                                                    a successful simulation proceeds to the wallet
                                                    (renamed 1:1 from use-buy-flow.test.tsx, same
                                                    3 tests, same acceptance property)
src/components/nffc/make-offer-form.test.tsx (3)   renders price/expiry/submit; submit disabled
                                                    until a price is entered; surfaces the honest
                                                    "not deployed yet" error without ever opening
                                                    a wallet
src/components/nffc/offer-row-actions.test.tsx (5) renders nothing while disconnected; shows
                                                    Cancel for the buyer; shows Accept for the
                                                    owner; renders nothing for neither; surfaces
                                                    the honest error on Cancel without opening a
                                                    wallet
src/components/nffc/offers-list.test.tsx (+1)      always renders the make-offer form, even with
                                                    no active offers
```

`pnpm contracts:test` → **172 Solidity tests**, unchanged (TASK-29 adds no `.sol`; the contract
behavior this TASK's UI relies on was already tested by TASK-19's `test_acceptOffer_expired_reverts`
/ `test_acceptOffer_atExpiryTimestamp_stillAcceptable`).

## BUILD

`pnpm build` green — **16 routes**, unchanged (TASK-29 extends the existing `/nffc/[tokenId]`
page, adds no new route).

Smoke-tested live via `pnpm dev`:

```
GET /nffc/1  → 200, "Make an offer on NFFC #1" / "Offer price" / "Expires in" / "Make offer" all
                render inside the Offers card
```

## LINT / TYPECHECK

Clean on the first pass — no fixes needed this TASK.

## SECURITY

STEP 5 AUDIT (`docs/spec/08-security-principles.md`):

| Concern | This TASK |
|---|---|
| **Ofertas expiradas no son aceptables on-chain aunque la UI no se haya refrescado** (acceptance) | Enforced entirely by `Marketplace.sol` (TASK-19, unmodified) — this TASK's UI never second-guesses or bypasses that check with client-side expiry logic of its own; every action calls the real contract function and accepts whatever it decides |
| A simulation failure is communicated before a signature is requested (TASK-18's acceptance property, extended) | `useMarketplaceActionFlow`'s `execute()` still gates `flow.request(...)` — the only thing that can open the wallet — behind `simulate()` resolving without throwing, for all four marketplace writes now, not just buy |
| Only the correct wallet can act on an offer row | `OfferRowActions` computes `isBuyer`/`isOwner` from the *connected* address vs. the row's own `buyerAddress`/the page's `ownerAddress` — a wrong wallet sees no action button at all, not a disabled one that might invite a doomed attempt |
| No real network/database in tests (`docs/conventions.md` §4) | `WagmiTestProviders` + the mock connector throughout, same pattern `BuyButton`'s own tests already use |

## PERFORMANCE

No new data-fetching path — `OffersList` still receives `offers` as a prop from the same
`NffcDetail` fetch TASK-21 already made. `OfferRowActions`'s two `useMarketplaceActionFlow` calls
are cheap (state only, no work until `execute()` is called).

## KNOWN ISSUES

1. **No live contract** — same blocker (TASK-31) every marketplace-write surface in this codebase
   shares (mint, buy, list, and now offer create/cancel/accept). Not logged as an open issue —
   scope already assigned to a named future TASK.
2. **No UI-side "this offer looks expired" indicator ahead of a failed on-chain attempt.** Not
   required by the acceptance criterion (which is about the *chain* being authoritative, not the
   UI's freshness) — deliberately not built, to avoid the UI silently disagreeing with the chain
   about the exact expiry boundary block (`test_acceptOffer_atExpiryTimestamp_stillAcceptable`
   proves that boundary is inclusive; an approximate client-side clock could get it wrong in
   either direction).
3. **Self-offers (a wallet offering on an NFFC it already owns) aren't prevented by this UI** —
   `Marketplace.sol` itself doesn't prevent them either (no `NotTokenOwner`-style guard on
   `createOffer`), so this matches the contract's own behavior rather than adding an
   unrequested restriction.

## ACCEPTANCE CRITERIA

`NFFC_Development_Plan.md` v3.4 TASK-29:

| Criterion | Status | Evidence |
|---|---|---|
| Ofertas expiradas no son aceptables on-chain aunque la UI no se haya refrescado | Met (by TASK-19, verified unmodified) | `Marketplace.sol.acceptOffer`'s `OfferExpired` revert; `contracts/Marketplace.t.sol`'s `test_acceptOffer_expired_reverts` / `test_acceptOffer_atExpiryTimestamp_stillAcceptable`; this TASK's UI never bypasses it |

Objective's other three facets (crear, aceptar, cancelar) — no separate criterion given, all three
built and tested: `MakeOfferForm` (create), `OfferRowActions` (accept/cancel).

## PULL REQUEST

Branch `task/TASK-29-offers`, based on **`main`** (TASK-00…28).

**PR: (to be filled in once opened)**
**CI: (to be filled in once green)**

**Do not merge** — Project Lead reviews and authorizes.

## NEXT TASK

**TASK-30 — Fee Engine** (`NFFC_Development_Plan.md` v3.4, depende de TASK-10, TASK-19).
Block-authorized — proceeding directly per the Project Lead's instructions, chained on this PR
once merged. Per the Project Lead's explicit condition on this block authorization, TASK-30's
report must pronounce explicitly on `docs/OPEN_ISSUES.md` Issue #3 (whether it's resolved or left
as-is, and why, under the final fee model) rather than repeating "no bloqueante" a third time.
