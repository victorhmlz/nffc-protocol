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
`IFeeConfig.setCollectionFeeParams` / `setMintFeeParams` and is decided in TASK-30. Candidate forms
(to be chosen and justified in the TASK-30 report):

- **Stepped table**: an array of 20 values, `fee[n]`.
- **Affine**: `base + slope * (n - 1)`.
- **Piecewise**: `base` up to a threshold, steeper beyond.

Requirements on whichever form is chosen:

- `fee(n) ≥ fee(n-1)` for all `n`.
- Bounded above by an on-chain hard cap so a misconfiguration cannot brick minting.
- Pure function of `n` and on-chain params — no oracle, no off-chain input.
- Quotable read-only before the transaction (`quoteCollectionCreationFee`, and a mint-fee quote view)
  so the UI shows the exact total **before** the user signs (`NFFC_Development_Plan.md` TASK-17
  acceptance).

## 3. Marketplace fee and royalty

- `marketplaceFeeBps` is a single protocol-wide value with an on-chain **hard cap**
  (`FeeOutOfBounds` reverts above it).
- `royaltyBps(collectionId)` is per-collection, also capped. Whether V1 enforces royalties on the
  native marketplace only (and merely advertises them via EIP-2981 metadata for external venues) is a
  TASK-19/TASK-30 decision; this spec only fixes that royalty is **configurable and not assumed
  externally honored**.
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
