# Threat Model (TASK-32)

**Scope:** contracts 05–31 (registries, adapters, `Collection.sol`, `NFFC.sol`, `Marketplace.sol`,
`FeeConfig.sol`) as they exist on `main` at TASK-31. Seeded by
`docs/spec/08-security-principles.md` — this document expands its §3 threat-surface table into a
STRIDE-style analysis per contract, closes two items that document explicitly deferred to TASK-32
(Issue #4, the F1 open finding's documentation), and reviews access control across every
role-gated function in the codebase. Application/off-chain threats (A1–A8 in
`08-security-principles.md`) are not re-litigated here — they're already rules, not open
questions; this document is contract-focused, matching the acceptance criteria's own scope
("tests de contratos con fuzzing", "access control").

**Methodology:** for each contract, walk STRIDE (Spoofing, Tampering, Repudiation, Information
disclosure, Denial of service, Elevation of privilege) against its actual state-changing
functions, not a generic checklist — a threat only appears in the tables below if there's a real
function/state it applies to. Each row gets a verdict: **Mitigated** (cite the mechanism),
**Accepted** (residual risk, reasoned), or **Open** (a genuine unresolved finding, logged in
`docs/OPEN_ISSUES.md`).

---

## 1. Trust boundaries

```
                        ┌─────────────────────────────────────────┐
                        │           Robinhood Chain (4663)          │
                        │                                           │
  EOA (any wallet) ───▶ │  NFFC.sol / Collection.sol / Marketplace  │
                        │  — public, permissionless entry points    │
                        │  (mint, buy, createListing, createOffer,  │
                        │  cancelListing, cancelOffer, acceptOffer) │
                        │                                           │
  FEE_ADMIN_ROLE ─────▶ │  FeeConfig.sol — fee curves, bps, royalty │
  REGISTRY_ADMIN_ROLE ▶ │  AssetIdentityRegistry / Representation-  │
                        │  Registry — allowlist admission            │
  PAUSER_ROLE ────────▶ │  pause()/unpause() on Collection/NFFC/    │
                        │  Marketplace                              │
  SYNC_ROLE (off-chain  │                                           │
  provider-sync worker)▶│  RobinhoodAdapter / CryptoAdapter          │
  DEFAULT_ADMIN_ROLE ──▶│  (the multisig, S8) — grants every role   │
                        │  above; not used for day-to-day calls      │
                        └─────────────────────────────────────────┘
```

Every arrow crossing into the contract layer is a trust boundary. The three role-gated arrows
(`FEE_ADMIN_ROLE`, `REGISTRY_ADMIN_ROLE`, `PAUSER_ROLE`, `DEFAULT_ADMIN_ROLE`) must, per S8, be held
by the protocol multisig in production — an operational fact enforced at deployment (TASK-36) and
verified at the TASK-40 mainnet gate, not something any of these Solidity contracts can check about
themselves (same reasoning `docs/admin.md` already gives for the admin panel). `SYNC_ROLE` is the
one role granted to an off-chain signer (the `provider-sync` worker, TASK-06/07) rather than a
human/multisig — narrower in scope by design (S7): it can only drive `syncUpsert`/`syncDeactivate`/
`syncDeactivateByToken`, each hardcoded to the calling adapter's own `_providerId()`/`_assetClass()`
(§3.5 below).

## 2. Per-contract STRIDE analysis

### 2.1 `AssetIdentityRegistry.sol` / `RepresentationRegistry.sol`

| Threat | Verdict | Detail |
|---|---|---|
| Spoofing — arbitrary account registers/deactivates an asset or representation | **Mitigated** | `onlyRole(REGISTRY_ADMIN_ROLE)` on `registerAssetIdentity`/`setAssetStatus`/`registerProvider`; `_requireProviderAuth` (role OR the representation's own registered adapter) on `registerRepresentation`/`setRepresentationStatus`/`deactivateRepresentation`/`updateOracleMetadata`. Tested: `test_nonAdmin_cannotRegister`, `test_nonAdmin_cannotSetStatus`, `test_stranger_cannotRegister`, `test_registerProvider_onlyAdmin`. |
| Elevation of privilege — an adapter for provider A mutates a representation belonging to provider B | **Mitigated** | `_requireProviderAuth` looks up `_providers[r.providerId]` (the *representation's own* provider), not the caller's — so `msg.sender == prov.adapter` can only ever be true for the representation's real provider. Tested for registration (`test_adapter_cannotRegisterForOtherProvider`); **this TASK adds** the same property for `setRepresentationStatus`/`deactivateRepresentation`/`updateOracleMetadata` (`test_setRepresentationStatus_unauthorizedCaller_reverts`, `test_deactivateRepresentation_unauthorizedCaller_reverts`, `test_updateOracleMetadata_unauthorizedCaller_reverts` — see §4, a genuine gap this review found and closed). |
| Tampering — registering an unverified token as a representation (S9: allowlist only) | **Mitigated** | `registerRepresentation` requires `token.code.length != 0`, a successful `decimals()` call matching the declared value (`_verifyDecimals`), a nonzero `multiplier`/`chainId`/`tokenStandard`, and an already-`ACTIVE` asset identity. No path turns a user-supplied address into a supported asset without an admin/adapter transaction. |
| Tampering — representation identity fields (`assetId`, `token`, `decimals`, `multiplier`, `chainId`, `providerId`) mutated post-registration | **Mitigated** | No setter exists for any of these — only `oracle` and `status` can change, by design (contract header, "Immutable-by-construction"). |
| Denial of service — an adapter mass-deactivates representations it doesn't own | **Mitigated** | Same `_requireProviderAuth` gate as above. |

### 2.2 `ProviderAdapterBase.sol` (`RobinhoodAdapter` / `CryptoAdapter`)

| Threat | Verdict | Detail |
|---|---|---|
| Elevation of privilege — `address(adapter)` holds registry-wide `REGISTRY_ADMIN_ROLE` on `AssetIdentityRegistry` (per the deployment wiring comment), so *in principle* it could call any `REGISTRY_ADMIN_ROLE` function, not just ones scoped to its own asset class | **Mitigated in practice, worth stating explicitly** | The adapter contract's own code never exposes a path to call `AssetIdentityRegistry.setAssetStatus` (or anything else) with an attacker-chosen `assetClass`/`assetId` — its only external functions (`syncUpsert`/`syncDeactivate`/`syncDeactivateByToken`, `SYNC_ROLE`-gated) call `registerAssetIdentity` with `klass = _assetClass()` hardcoded per adapter, and never call `setAssetStatus` at all. **Least privilege here is enforced by the calling contract's limited code surface, not by the role's own scoping** — worth calling out because it means a future adapter that reused this base contract but added a raw pass-through method would silently reopen this without any change to `AssetIdentityRegistry` itself. No code change needed today; flagged as a design constraint for any future adapter. |
| Spoofing — an account without `SYNC_ROLE` drives a sync | **Mitigated** | `onlyRole(SYNC_ROLE)` on all three entry points; tested per-adapter (`RobinhoodAdapter.t.sol`, `CryptoAdapter.t.sol`). |

### 2.3 `Collection.sol`

| Threat | Verdict | Detail |
|---|---|---|
| Tampering — non-creator edits a collection's metadata | **Mitigated** | `setCollectionMetadata` checks `_owner[collectionId] == msg.sender`; tested. |
| Denial of service — non-`PAUSER_ROLE` pauses collection creation | **Mitigated** | `onlyRole(PAUSER_ROLE)`; tested (`test_pause_onlyPauser`). |
| Tampering — fee underpayment/overpayment accepted | **Mitigated** | Exact `msg.value == required` check, `CollectionCreationFeeNotMet` otherwise. |

### 2.4 `NFFC.sol` — mint (critical path)

| Threat | Verdict | Detail |
|---|---|---|
| Tampering — composition invariants I1–I8 bypassed (component count, weight sum, duplicate asset, zero weight, inactive/unregistered representation, asset/representation mismatch) | **Mitigated, now fuzzed** | Each invariant already had a fixed-input revert test; **this TASK adds** `testFuzz_mint_weightSumMismatch_reverts(uint16,uint16)` — I2 held for the *entire* two-component input space (not just one hand-picked bad sum) and `testFuzz_mint_twoComponentWeights` already covers the entire valid-sum space. |
| Tampering — composition mutated after mint | **Mitigated** | No function, under any role, writes to `_composition`/`_compositionHash`/`_segment` after `mint` (I7); `test_composition_survivesTransfer_andHasNoMutator` proves this across a transfer. |
| Tampering — mint fee underpaid/overpaid/never charged | **Mitigated, now fuzzed as a property** | `testFuzz_mint_feeMismatch_reverts(uint256)` (new, this TASK) generalizes the existing two fixed off-by-one tests (`test_mint_underpay_reverts`/`test_mint_overpay_reverts`) to the full mismatched-value space. |
| Denial of service — non-`PAUSER_ROLE` pauses minting | **Mitigated, now fuzzed** | `testFuzz_pause_onlyPauser(address)` (new, this TASK) generalizes the fixed-caller test to every non-admin address. |
| Elevation of privilege — segment (`CRYPTO_ONLY`/`STOCK_ONLY`/`MIXED`) supplied directly by the caller instead of derived | **Mitigated** | `MintParams` has no segment field; it's computed server-side-in-contract from each component's `assetClass` via `CompositionSegmentLib`. |
| Reentrancy on the fee-forwarding call | **Mitigated** | `nonReentrant`; fee forwarding is CEI-ordered after all storage writes; `test_mint_feeTransferFails_reverts` proves a failing recipient reverts the whole mint rather than silently dropping the fee. |

### 2.5 `Marketplace.sol` — buy / offers (critical path)

| Threat | Verdict | Detail |
|---|---|---|
| Reentrancy on `buy`/`acceptOffer`/`cancelOffer` payout legs | **Mitigated** | `nonReentrant` + CEI (state flips before any external call) on all three; proven by four dedicated attacker-contract tests (`test_buy_reentrancy_blocked`, `test_buy_reentrancyViaOnERC721Received_blocked`, `test_acceptOffer_reentrancy_blocked`, `test_cancelOffer_reentrancy_blocked`), not just asserted in a comment. |
| Spoofing — non-seller cancels a listing / non-buyer cancels an offer | **Mitigated, now fuzzed** | `testFuzz_cancelListing_onlySeller` (pre-existing) and `testFuzz_cancelOffer_onlyBuyer` (new, this TASK) both hold for every caller address that isn't the rightful one. |
| Spoofing — non-owner accepts an offer on someone else's token | **Mitigated, now fuzzed** | `testFuzz_acceptOffer_onlyCurrentOwner` (new, this TASK) generalizes `test_acceptOffer_notOwner_reverts`'s single fixed caller to every non-owner address. |
| Tampering — price mismatch accepted on `buy` | **Mitigated, now fuzzed as a property** | `testFuzz_buy_priceMismatch_reverts(uint96,uint96)` (new, this TASK) generalizes the two fixed underpay/overpay tests to the entire mismatched-value space, for arbitrary listing prices too. |
| Tampering — an offer is acceptable past its expiry, or wrongly rejected before it | **Mitigated, now fuzzed as a property** | `testFuzz_acceptOffer_expiryBoundary(uint64,uint64)` (new, this TASK) proves the exact boundary (`now <= expiry` acceptable, `now > expiry` rejected) across the whole `(expiry, now)` space, not just the two hand-picked timestamps `test_acceptOffer_expired_reverts`/`test_acceptOffer_atExpiryTimestamp_stillAcceptable` already covered. |
| Tampering — fee/royalty math overflows, underflows, or fails to conserve value | **Mitigated, already fuzzed** | `testFuzz_buy_feeRoyaltySplit_conservesValue` (pre-existing) proves `fee + royalty + sellerProceeds == price` exactly, across the full bps and price space; Solidity 0.8's checked arithmetic reverts on the underflow case (`fee + royalty > price`) rather than wrapping. |
| Denial of service — non-`PAUSER_ROLE` pauses the marketplace | **Mitigated, now fuzzed** | `testFuzz_pause_onlyPauser(address)` (new, this TASK). |
| Front-running (listing price changes, buy/offer races) | **Accepted risk, deferred to TASK-40 — see §3** | `docs/OPEN_ISSUES.md` Issue #4. |

### 2.6 `FeeConfig.sol`

| Threat | Verdict | Detail |
|---|---|---|
| Elevation of privilege — non-`FEE_ADMIN_ROLE` changes any fee parameter | **Mitigated** | All six setters (`setCollectionFeeParams`, `setMintFeeParams`, `setMarketplaceFeeBps`, `setRoyaltyBps`, `setFeeRecipient`, `setCollection`) are `onlyRole(FEE_ADMIN_ROLE)`, each with a dedicated unauthorized-caller test (`test_nonAdmin_cannotSet*`, §4). |
| Tampering — a fee parameter set beyond its hard cap | **Mitigated** | `MAX_CURVE_FEE_AT_MAX_N`, `MAX_MARKETPLACE_FEE_BPS`, `MAX_ROYALTY_BPS` are `constant`, checked in every setter and the constructor — no admin transaction, however privileged, can exceed them. `testFuzz_curves_areMonotonic` (pre-existing) additionally proves the curve can never decrease as `n` grows. |
| Royalty resolves to a nonexistent collection (`docs/OPEN_ISSUES.md` former Issue #3) | **Already closed in TASK-30** | `setRoyaltyBps` requires `collection.collectionExists(collectionId)`; no action needed this TASK. |

## 3. Issue #4 — front-running, evaluated and explicitly deferred to TASK-40

`docs/OPEN_ISSUES.md` Issue #4 named this TASK as the place to either mitigate it or make a real
call. Analysis of every state-changing entry point in `Marketplace.sol`:

- **`buy`** requires `msg.value == l.price` *exactly* — there is no slippage tolerance, no
  approximate match. A classic AMM sandwich attack (front-run to move a price, victim executes at
  the worse price, back-run to capture the difference) has **no surface here**: the price is a
  fixed value written by the seller, not computed from a curve or reserve a searcher could move
  between the victim's submission and execution.
- **A race between two buyers on the same listing** (both submit `buy` for the same `tokenId`) is
  resolved atomically by whichever transaction lands first; the loser's call hits `!l.active` (already
  closed) or `msg.value != l.price` after a concurrent price change, and **reverts entirely** — the
  loser's ETH is never sent (a revert unwinds the whole call, so `msg.value` never leaves their
  wallet in the first place). The cost of losing a race is gas only, not principal.
- **A seller changing/cancelling a listing while a `buy` is pending in the mempool** is the seller
  exercising their own right over their own listing (`cancelListing`/re-`createListing` at a new
  price) — this can only ever disappoint a *specific counterparty's* pending transaction (which
  reverts harmlessly, per above), never extract value from them. It is not a third party profiting
  at a victim's expense — the two hallmarks of an MEV attack (searcher profit + victim loss) are
  both absent.
- **`createOffer`/`cancelOffer`/`acceptOffer`** have the same properties: `acceptOffer` is
  restricted to the token's current owner (`NotTokenOwner`), so no third party can front-run to
  "steal" an offer's acceptance; a buyer's own `cancelOffer` racing the seller's `acceptOffer` on
  the same offer is again resolved atomically with the loser reverting harmlessly (escrow refunded
  if `cancelOffer` wins, cancelled offer rejected if `acceptOffer` wins first).

**Conclusion: in this exact fixed-price, exact-match, atomic-settlement design, front-running has
no fund-loss vector** — every race resolves to "one party's transaction reverts, no one's
principal moves incorrectly." This is different from, and materially safer than, the "front-running
a listing price change" entry `docs/spec/08-security-principles.md` §3 names as a known threat
*category* for on-chain marketplaces in general — that entry described the class of risk before
this analysis had been done against this contract's actual mechanics.

**Deliberately deferred, not mitigated, in this TASK:** a formal MEV mitigation (commit-reveal
listings, a private-relay requirement, or a `buy(tokenId, maxPrice)` signature instead of an exact
match) is real engineering work with its own tradeoffs (UX friction, an extra transaction, relay
availability on Robinhood Chain specifically) that depends on operational facts not yet known — how
Robinhood Chain's actual mempool behaves, whether a private relay exists for it, and what UX cost is
acceptable. `NFFC_Development_Plan.md` TASK-40's own scope already includes "deployment scripts
proven on testnet" and an "independent security audit" — the right place to weigh a concrete MEV
mitigation against real testnet mempool conditions, not a Solidity-only judgment call made before
any of that infrastructure exists. **This is a reasoned deferral, not a restatement of "not
blocking, not logged"** — `docs/OPEN_ISSUES.md` Issue #4 is updated (not deleted — it isn't
resolved) to record this analysis and point explicitly at TASK-40 instead of "sin asignar todavía".

## 4. Access control review

Every `onlyRole`-gated (or custom-role-checked) function in the codebase, and its test coverage
before vs. after this TASK:

| Contract | Function | Role/gate | Before TASK-32 | After TASK-32 |
|---|---|---|---|---|
| `AssetIdentityRegistry` | `registerAssetIdentity` | `REGISTRY_ADMIN_ROLE` | tested (fixed caller) | unchanged |
| `AssetIdentityRegistry` | `setAssetStatus` | `REGISTRY_ADMIN_ROLE` | tested (fixed caller) | unchanged |
| `RepresentationRegistry` | `registerProvider` | `REGISTRY_ADMIN_ROLE` | tested (fixed caller) | unchanged |
| `RepresentationRegistry` | `setProviderAdapter` | `REGISTRY_ADMIN_ROLE` | **untested** | **fixed: `test_setProviderAdapter_onlyAdmin_reverts`** |
| `RepresentationRegistry` | `setProviderActive` | `REGISTRY_ADMIN_ROLE` | **untested** | **fixed: `test_setProviderActive_onlyAdmin_reverts`** |
| `RepresentationRegistry` | `registerRepresentation` | role OR own adapter | tested (both paths) | unchanged |
| `RepresentationRegistry` | `setRepresentationStatus` | role OR own adapter | **untested** | **fixed: `test_setRepresentationStatus_unauthorizedCaller_reverts`** |
| `RepresentationRegistry` | `deactivateRepresentation` | role OR own adapter | **untested** | **fixed: `test_deactivateRepresentation_unauthorizedCaller_reverts`** |
| `RepresentationRegistry` | `updateOracleMetadata` | role OR own adapter | **untested** | **fixed: `test_updateOracleMetadata_unauthorizedCaller_reverts`** |
| `ProviderAdapterBase` (×2 adapters) | `syncUpsert`/`syncDeactivate`/`syncDeactivateByToken` | `SYNC_ROLE` | tested (fixed caller, per adapter) | unchanged |
| `Collection` | `pause`/`unpause` | `PAUSER_ROLE` | tested (fixed caller) | unchanged |
| `Collection` | `setCollectionMetadata` | owner-only (not role) | tested | unchanged |
| `NFFC` | `pause`/`unpause` | `PAUSER_ROLE` | tested (fixed caller) | **hardened: `testFuzz_pause_onlyPauser`** |
| `Marketplace` | `pause`/`unpause` | `PAUSER_ROLE` | tested (fixed caller) | **hardened: `testFuzz_pause_onlyPauser`** |
| `Marketplace` | `cancelListing` (seller-only) | not role-based | tested (fixed + fuzzed) | unchanged |
| `Marketplace` | `cancelOffer` (buyer-only) | not role-based | tested (fixed caller) | **hardened: `testFuzz_cancelOffer_onlyBuyer`** |
| `Marketplace` | `acceptOffer` (owner-only) | not role-based | tested (fixed caller) | **hardened: `testFuzz_acceptOffer_onlyCurrentOwner`** |
| `FeeConfig` | `setCollectionFeeParams` | `FEE_ADMIN_ROLE` | tested (fixed caller) | unchanged |
| `FeeConfig` | `setMintFeeParams` | `FEE_ADMIN_ROLE` | tested (fixed caller) | unchanged |
| `FeeConfig` | `setMarketplaceFeeBps` | `FEE_ADMIN_ROLE` | tested (fixed caller) | unchanged |
| `FeeConfig` | `setRoyaltyBps` | `FEE_ADMIN_ROLE` | tested (fixed caller) | unchanged |
| `FeeConfig` | `setFeeRecipient` | `FEE_ADMIN_ROLE` | tested (fixed caller) | unchanged |
| `FeeConfig` | `setCollection` | `FEE_ADMIN_ROLE` | tested (fixed caller) | unchanged |

**Finding:** three functions in `RepresentationRegistry.sol` (`setProviderAdapter`,
`setProviderActive`) and the shared `_requireProviderAuth` gate as exercised by three more
(`setRepresentationStatus`, `deactivateRepresentation`, `updateOracleMetadata`) had **no**
unauthorized-caller test at all before this TASK — a genuine access-control review gap, not a
contract defect (the `onlyRole`/`_requireProviderAuth` checks themselves were always correct; only
the *proof* was missing). Closed with 5 new tests in `RepresentationRegistry.t.sol`, all passing.

## 5. Fuzzing coverage — mint and marketplace (acceptance criterion)

| File | Fuzz test | What it proves |
|---|---|---|
| `NFFC.t.sol` | `testFuzz_mint_twoComponentWeights` (pre-existing) | Any valid two-component weight split (summing to 10 000) mints successfully with the right stored weights and segment. |
| `NFFC.t.sol` | `testFuzz_mint_componentCount_allCrypto` (pre-existing) | Any component count 1–20 mints successfully as `CRYPTO_ONLY`. |
| `NFFC.t.sol` | `testFuzz_mint_weightSumMismatch_reverts` (new) | Any two-component weight pair that does **not** sum to 10 000 reverts `WeightSumNot10000` — I2's negative space, not just its positive space. |
| `NFFC.t.sol` | `testFuzz_mint_feeMismatch_reverts` (new) | Any `msg.value` other than the exact quoted fee reverts `MintFeeNotMet`. |
| `NFFC.t.sol` | `testFuzz_pause_onlyPauser` (new) | No address other than the pauser can pause minting. |
| `Marketplace.t.sol` | `testFuzz_cancelListing_onlySeller` (pre-existing) | No address other than the seller can cancel a listing. |
| `Marketplace.t.sol` | `testFuzz_buy_feeRoyaltySplit_conservesValue` (pre-existing) | `fee + royalty + sellerProceeds == price` exactly, across the full bps/price space. |
| `Marketplace.t.sol` | `testFuzz_cancelOffer_onlyBuyer` (new) | No address other than the offer's buyer can cancel it. |
| `Marketplace.t.sol` | `testFuzz_acceptOffer_onlyCurrentOwner` (new) | No address other than the token's current owner can accept an offer on it. |
| `Marketplace.t.sol` | `testFuzz_acceptOffer_expiryBoundary` (new) | Acceptance succeeds iff `now <= expiry`, across the full `(expiry, now)` space — the exact-boundary property, not two hand-picked timestamps. |
| `Marketplace.t.sol` | `testFuzz_buy_priceMismatch_reverts` (new) | Any `msg.value` other than the exact listed price reverts `PriceMismatch`, across the full price/value space. |
| `Marketplace.t.sol` | `testFuzz_pause_onlyPauser` (new) | No address other than the pauser can pause the marketplace. |

11 fuzz tests total across the two critical paths named by the acceptance criterion (6 pre-existing
+ 5 new to mint, 6 total to marketplace with 5 new), each run 256 times by Foundry's default fuzz
config. `pnpm contracts:test`: **224 Solidity tests** (was 211; +13: 8 new fuzz tests + 5 new
access-control unit tests).

## 6. F1 — composite-instrument classification risk: recorded open, not resolved here

Per this TASK's own acceptance criterion and `docs/spec/08-security-principles.md` §4 (F1):

> An NFFC bundling weighted asset representations may, depending on jurisdiction, marketing,
> custody, and economic rights, be treated as a fund or composite/structured product
> (`NFFC_Whitepaper.md` §14).

**This threat model records F1 as an open finding and does not attempt to close it.** It is not an
engineering question with an engineering answer — no contract change, test, or code review can
determine whether NFFC's structure triggers fund/composite-instrument classification in any given
jurisdiction; that determination depends on legal analysis of securities/commodities/collective-
investment-scheme law across every jurisdiction the protocol operates in, informed by how the
product is actually marketed and used, not just its code. This document restates the finding, cross-
references its origin (`08-security-principles.md` §4, `NFFC_Whitepaper.md` §14), and stops there —
resolving it is explicitly **the Project Lead's decision, made with legal counsel**, per that
section's own text ("Status: open; independent legal review required... before any V2") and
`NFFC_Development_Plan.md`'s TASK-40 gate. Marking this "mitigated" or "closed" from inside a threat
model would be the threat model overstepping into a determination it has no authority or expertise
to make — so it stays open, deliberately, here and in `08-security-principles.md`, through TASK-40.

## 7. Residual risks carried forward (not new, restated for completeness)

- **F2 (geographic exclusion)** and **F3 (Reference NAV framing)** — both already tracked in
  `docs/spec/08-security-principles.md` §4, both open for legal sign-off, unaffected by this TASK.
- **Independent security audit** — `NFFC_Development_Plan.md` TASK-40 explicitly requires one; this
  threat model and its fuzz tests are this project's own internal review, not a substitute for
  third-party audit.
- **`docs/OPEN_ISSUES.md`** — every other open issue (front-running excepted, resolved above) is
  unrelated to security hardening and untouched by this TASK.
