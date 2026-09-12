# 06 — Fee Model

**Source intent:** `NFFC_Whitepaper.md` v1.1 §6, §8, §12; `NFFC_Roadmap.md` v1.1 Fase 07, Fase 24;
`NFFC_Development_Plan.md` v3.2 TASK-10, TASK-30.

> **No amounts are fixed in this document.** Every value below is a parameter set on-chain by
> `FEE_ADMIN_ROLE` (a multisig) via `IFeeConfig` (`04-contract-interfaces.md` §7). The frontend
> **reads** these values and never embeds them.

---

## 1. The four fee types

| Fee | Charged when | Scales with | Paid by | Configured in |
|---|---|---|---|---|
| **Collection Creation Fee** | Creating a collection | Composition **complexity** (component count of the collection's intended composition) | Creator | `IFeeConfig.collectionCreationFee(componentCount)` |
| **Mint Fee** | Minting an NFFC | **Number of components** in that NFFC | Creator (minter) | `IFeeConfig.mintFee(componentCount)` |
| **Marketplace Fee** | A sale (`buy`) or `acceptOffer` | Percentage of sale price | Buyer/seller split per TASK-30 decision | `IFeeConfig.marketplaceFeeBps()` |
| **Creator Royalty** | A secondary sale, where enforceable | Percentage of sale price, per collection | Seller (from proceeds) | `IFeeConfig.royaltyBps(collectionId)` |

`NFFC_Whitepaper.md` §6: *"El Collection Creation Fee crecerá con la complejidad de la composición.
El Mint Fee también crecerá con el número de componentes."*
`NFFC_Whitepaper.md` §8: marketplace commission is configurable; **non-binding design target ≈ 1,5%**,
subject to economic validation.
`NFFC_Whitepaper.md` §8: *"Creator royalties podrán contemplarse, pero no se asumirá que todos los
marketplaces externos los hagan cumplir."*

## 2. Fee curves (shape, not values)

The creation-fee and mint-fee curves are **monotonically non-decreasing functions of component
count** `n` (with `1 ≤ n ≤ 20`). The exact encoding of the curve lives in the `params` blob of
`IFeeConfig.setCollectionFeeParams` / `setMintFeeParams`.

**Decided in TASK-30: affine, `base + slope * (n - 1)`.** Chosen over a stepped table or a
piecewise curve because it's monotonically non-decreasing *by construction* whenever `slope ≥ 0`
— guaranteed structurally (no negative `uint256`), so there's no separate "is this table sorted"
invariant to maintain on every update the way a stepped table would need. It's also the cheapest
possible configurable curve to store and read (two `uint256` words, no `SLOAD` loop over a table),
and nothing in this spec asks for a piecewise curve's extra flexibility (a step-change at some
threshold) beyond "monotonic and bounded." `FeeConfig.sol`'s own test double
(`contracts/mocks/MockFeeConfig.sol`, already used by `Collection.t.sol` / `Marketplace.t.sol`
since TASK-10/19) already assumed exactly this form.

Requirements on the curve, all enforced by `FeeConfig.sol`:

- `fee(n) ≥ fee(n-1)` for all `n` — free, by construction (see above).
- Bounded above by an on-chain hard cap so a misconfiguration cannot brick minting:
  `FeeConfig.MAX_CURVE_FEE_AT_MAX_N` (`1 ether` in this codebase's default deployment
  parameters) bounds `base + slope * 19` for both curves, checked at construction and on every
  `set*FeeParams` call — `immutable`/`constant`, never itself admin-settable, so a compromised or
  fat-fingered `FEE_ADMIN_ROLE` transaction can misconfigure a fee within this ceiling but never
  above it.
- Pure function of `n` and on-chain params — no oracle, no off-chain input.
- Quotable read-only before the transaction (`quoteCollectionCreationFee`, and `quoteMintFee` on
  `INFFC`, added in TASK-30) so the UI shows the exact total **before** the user signs
  (`NFFC_Development_Plan.md` TASK-17 acceptance).

## 3. Marketplace fee and royalty

- `marketplaceFeeBps` is a single protocol-wide value with an on-chain **hard cap**
  (`FeeConfig.MAX_MARKETPLACE_FEE_BPS`, 1000 bps / 10% — `FeeOutOfBounds` reverts above it).
- `royaltyBps(collectionId)` is per-collection, capped the same way
  (`FeeConfig.MAX_ROYALTY_BPS`, also 1000 bps). **Decided in TASK-30:** V1 enforces royalties on
  the native marketplace only (`Marketplace.sol`'s `_settle`, TASK-19) — external venues are never
  assumed to honor them, matching this spec's existing "not assumed externally honored" line; no
  separate EIP-2981 metadata surface is added in V1.
- **Decided in TASK-30 (ratifying what `Marketplace.sol`'s `_settle` already implemented in
  TASK-19):** the marketplace fee and royalty are deducted **from the seller's proceeds** —
  `sellerProceeds = price - fee - royalty`. The buyer pays exactly the listed/offered `price`, no
  markup on top. This is the standard, common marketplace fee model (the same one most NFT
  marketplaces use) and needed no change to already-merged, already-tested settlement math to
  ratify.
- `FeeConfig.setRoyaltyBps` additionally requires the `collectionId` to actually exist in
  `Collection.sol` (`ICollection.collectionExists`, added in TASK-30) — see
  `docs/OPEN_ISSUES.md`'s changelog for the former Issue #3, which this closes.
- In `buy` / `acceptOffer` the split is computed and paid **atomically** with the NFT transfer, using
  checks-effects-interactions (`04-contract-interfaces.md` §6).

## 4. Where fees live and how they change

```
IFeeConfig (on-chain, FEE_ADMIN_ROLE = multisig)
   ├── read by  Collection.sol   (creation fee)
   ├── read by  NFFC.sol         (mint fee, collected in mint())
   ├── read by  Marketplace.sol  (marketplace fee + royalty)
   └── read by  the frontend     (fee preview) — via RPC/read layer, never hardcoded
```

- Changing any fee = one admin transaction to `IFeeConfig`. **No contract redeploy, no frontend
  deploy** (`NFFC_Development_Plan.md` TASK-10 and TASK-30 acceptance).
- Every change emits an event; the indexer records fee-param history for the admin panel and reports
  (TASK-31).
- `feeRecipient` is a single configurable address (expected: a protocol treasury multisig).
- **Deployment order** (`FeeConfig.sol`, TASK-30): `FeeConfig` and `Collection.sol` each need the
  other's address (`FeeConfig.setRoyaltyBps` validates against `Collection`; `Collection` reads its
  creation fee from `FeeConfig`) — a genuine constructor cycle neither side can resolve alone. Deploy
  `FeeConfig` first (with its `collection` reference unset), then `Collection` (with `FeeConfig`'s
  real address), then one `FEE_ADMIN_ROLE` call to `FeeConfig.setCollection(address(collection))`
  before any royalty can be configured — then `NFFC.sol` and `Marketplace.sol` as before.

## 5. Fee preview in the UI (TASK-17, TASK-24 Roadmap "fee preview")

The create wizard's step 6 shows, before signing:

- Collection creation fee (if creating a collection in the same flow), from `quoteCollectionCreationFee(n)`.
- Mint fee, from the mint-fee quote view for `n` components.
- Gas estimate (from simulation), clearly separated from protocol fees.
- The total the wallet will be asked to spend.

The marketplace purchase modal shows price + marketplace fee + royalty breakdown before the buyer
signs.

## 6. Revenue model context (`NFFC_Whitepaper.md` §12)

Protocol revenue in V1 comes from the four fees above. Later, non-V1 sources: premium analytics,
third-party API access, B2B services. A **V1.5 native utility token** may grant fee discounts (reduced
mint and marketplace fees proportional to holdings) and priority access — specified in TASK-43/44,
**not** in V1, and any revenue-sharing mechanism is gated on legal review (`NFFC_Whitepaper.md` §17).

## 7. Out of scope for the fee model (V1)

- Dynamic/temporal fee schedules, auctions, or bonding curves.
- Token-denominated fees (V1 fees are in chain native currency; a quote token is `// OPEN` for later).
- Fee rebates, referral splits, or discount tiers (V1.5 token utility territory).
