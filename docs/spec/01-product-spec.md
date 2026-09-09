# 01 — Product Specification

**Source intent:** `NFFC_Whitepaper.md` v1.1 §1–4, §12–15; `NFFC_Roadmap.md` v1.1 Fase 00;
`NFFC_Development_Plan.md` v3.2 TASK-00.

---

## 1. Vision

NFFC Protocol turns a **financial composition** — a weighted set of on-chain asset representations —
into a unique, ownable, tradable digital collectible: a **Non-Fungible Financial Collectible (NFFC)**.

An NFFC is an ERC-721 whose identity embeds an **immutable composition**: between 1 and 20 components,
each a reference to a *verified* on-chain representation of a financial asset, each with a weight in
basis points, summing to exactly 10,000.

The protocol is **blockchain-agnostic and provider-agnostic by design**. Robinhood Chain and Robinhood
Stock Tokens are the first network and the first traditional-asset provider; a native-crypto provider
(BTC, ETH via Chainlink) ships **in the same release**. Neither is privileged in the code.

NFFC Protocol is **not** another general NFT marketplace. It is infrastructure for representing
financial compositions as collectibles with history, a reference valuation, rarity, and a secondary
market.

## 2. What a user can do in V1

- **Create** a collection and **mint** an NFFC by choosing assets (Stock Tokens, native crypto, or a
  mix) and assigning weights.
- **Value**: see a **Reference NAV** derived from oracle prices, always labeled as a reference, never
  as backing.
- **Trade**: list, cancel, buy; make, accept, cancel offers with expiry.
- **Hold**: view an owned portfolio, per-NFFC performance vs. mint, and activity history.
- **Explore**: browse the marketplace, open a shareable per-NFFC detail page, search by composition
  ("contains NVDA", "contains ETH"), rarity, and mint condition.

Every NFFC also carries, fixed at mint: generative art derived from its actual weights, a
**static rarity** score from composition concentration, and a **mint-condition trait** recording the
weighted market state at mint. See `10-version-boundaries.md` and `NFFC_Whitepaper.md` §16.

## 3. V1 scope (in)

| Area | V1 content |
|---|---|
| Token standard | ERC-721, immutable composition, 1–20 components, weights in BPS summing to 10,000 |
| Providers | Robinhood Stock Tokens **and** native crypto (BTC, ETH), from launch, as peers |
| Network | Robinhood Chain, Chain ID 4663 (L2 on Arbitrum, gas in ETH) |
| Registry | On-chain Asset Identity + Representation registry; allowlist only |
| Valuation | Reference NAV = Σ(weightᵢ × normalizedPriceᵢ), Chainlink as sole oracle |
| Market | Marketplace contract: list / cancel / buy; offers with expiry |
| Fees | Collection creation fee, mint fee, marketplace fee, optional creator royalty — all parameterized |
| Identity mechanics | Generative art, static rarity, mint-condition trait — all fixed at mint |
| Segmentation | Each NFFC auto-labeled crypto-only / stock-only / mixed |
| Custody | None. All holdings in the user's self-custody wallet |
| Surfaces | Marketplace, NFFC detail, create wizard, mint flow, portfolio, activity, profiles, search, admin |

## 4. Non-goals (explicitly out of V1)

From `NFFC_Whitepaper.md` v1.1 §4:

- **No custody** of Stock Tokens, crypto, or the NFFC itself. No vaults.
- **No share purchase** on behalf of users.
- **No staking, no lending.**
- **No guaranteed or advertised yield.**
- **No discretionary portfolio management.**
- **No native token in V1** (the native utility token is V1.5 — `NFFC_Whitepaper.md` §17).
- **No claim of ownership** over underlying securities where no such right exists.
- **No backed NFFC** (`NFFC → Vault → Stock Tokens`) — that is V2, blocked by design.
- **No dynamic performance badges / Market-State leaderboard** — those are V1.5.

## 5. Users

| Persona | Goal | Primary surfaces |
|---|---|---|
| **Creator** | Compose and mint an NFFC that expresses a financial thesis or aesthetic | Create wizard, mint flow, collection management, creator profile |
| **Collector / trader** | Discover, value, buy, and resell NFFCs | Marketplace, NFFC detail, offers, portfolio, activity |
| **Holder** | Track an owned NFFC's reference value and history over time | Portfolio, NFFC detail, activity |
| **Administrator** (multisig) | Curate assets and representations, tune fees, monitor health | Admin panel |
| **Observer** (no wallet) | Read marketplace and NFFC pages, share links | Marketplace, NFFC detail (server-rendered, wallet not required to view) |

## 6. User journeys

### 6.1 Create and mint

1. Creator opens the create wizard: (1) basic info, (2) select assets from a single surface mixing
   Stock Tokens and crypto, (3) set weights, (4) validation, (5) preview (including the exact
   generative art), (6) fees shown in full, (7) mint.
2. The mint flow simulates first. A simulation failure is surfaced **before** any signature request.
3. On signature, the wallet state machine advances `SIGNING → SUBMITTED → CONFIRMING`. The generative
   art and mint-condition trait are produced at the correct point in the flow.
4. `SUCCESS` is shown **only** after on-chain confirmation. The NFFC now has a stable public URL.

### 6.2 Value and monitor

1. Any NFFC detail page shows composition, per-component weight, Reference NAV, and performance
   windows, each with the oracle source and last-update timestamp visible.
2. Data that is loading or errored is shown as such — never a blank value with no explanation.

### 6.3 Trade

1. Owner lists an NFFC at a price; the listing is indexed and appears in the marketplace.
2. A buyer purchases; the marketplace contract transfers the NFFC and splits fees atomically.
3. Alternatively a buyer makes an offer with an expiry; the owner accepts before expiry. An expired
   offer is not acceptable on-chain regardless of UI state.
4. Any listing can be cancelled only by its owner.

### 6.4 Hold and resell

1. Portfolio aggregates owned NFFCs, reference value, performance vs. mint, and exposure by asset and
   by segment.
2. The holder relists or accepts an offer; activity records every mint, sale, transfer, listing, and
   offer.

## 7. Economic model (summary; full model in `06-fee-model.md`)

Revenue sources (`NFFC_Whitepaper.md` §12): collection creation fee, mint fee, marketplace fee,
creator royalty where enforceable, plus later premium analytics / third-party API / B2B services.

- **Collection creation fee** grows with composition complexity.
- **Mint fee** grows with the number of components.
- **Marketplace fee** is a configurable percentage; the Whitepaper's non-binding design target is
  ~1.5% (`NFFC_Whitepaper.md` §8), subject to economic validation.
- **Creator royalty** may be offered but is not assumed to be honored by external marketplaces.

All amounts are configurable on-chain by admin/multisig and are **never hardcoded in the frontend**.
There is no native token in V1; a V1.5 utility token can later grant fee discounts and priority access
(`NFFC_Whitepaper.md` §17).

## 8. Risks and open questions

These are recorded as **open findings**, not resolved here. They must be revisited in TASK-32
(Security Hardening) and TASK-40 (Mainnet Readiness).

| # | Risk | Status |
|---|------|--------|
| R1 | **Regulatory classification** of an NFFC as a fund / composite instrument, depending on jurisdiction, marketing, custody, and economic rights (`NFFC_Whitepaper.md` §14). | Open. Legal review required before large-scale commercial use and before any V2. |
| R2 | **Geographic exclusion**: Robinhood Stock Tokens are unavailable to US persons and restricted in CA/UK/CH and others; any NFFC containing ≥1 Stock Token inherits that restriction. 100%-crypto compositions do not inherit this specific restriction (`NFFC_Whitepaper.md` §14). | Open. Must be surfaced in UX (`07-ux-map.md`) and covered by legal review (TASK-40). |
| R3 | **Oracle dependency**: Reference NAV, the mint-condition trait, and (later) dynamic badges all depend on Chainlink. Oracle staleness, gaps, or feed retirement degrade or block those features. | Open. Price Engine (TASK-22) must carry source + timestamp on every price and define staleness behavior. |
| R4 | **Representation drift**: a provider delists or changes a token underneath a minted NFFC. | Partially mitigated: adapters auto-deactivate delisted representations (TASK-06); composition stays immutable; downstream valuation must degrade gracefully. |
| R5 | **"Reference NAV" misread as backing or as investment performance.** | Mitigated by labeling rules (`07-ux-map.md`), never bare "value"; Market-State copy is legal-reviewed (V1.5). |
| R6 | **Marketplace economic parameters** (fee %, royalty) not yet validated. | Open. Design target only; TASK-30 centralizes configuration so changes need no redeploy. |

## 9. Acceptance criteria coverage (TASK-00)

| Criterion (`NFFC_Development_Plan.md` v3.2 TASK-00) | Where satisfied |
|---|---|
| Architecture coherent with public Whitepaper and Roadmap | This file §3–§4; `00-README.md` mapping table; `03-architecture.md` |
| Asset Identity separated from Representation explicitly | `02-domain-model.md` §2 and the dedicated "Asset Identity ≠ Representation" subsection |
| Robinhood decoupled from the core domain in every diagram | `02-domain-model.md`, `03-architecture.md`, `05-adapter-architecture.md` |
| V1 / V1.5 / V2 boundaries clearly separated | `10-version-boundaries.md` |
| Native crypto is a V1 provider, not a future extension | This file §1, §3; `10-version-boundaries.md`; `05-adapter-architecture.md` |
