# 10 — Version Boundaries (V1 / V1.5 / V2)

**Source intent:** `NFFC_Whitepaper.md` v1.1 §4, §11, §16, §17; `NFFC_Development_Plan.md` v3.2
milestones M0/M1/M1.5/M2 and its "Resumen de dependencias críticas"; `NFFC_Roadmap.md` v1.1.

This is the authoritative, unambiguous split. If a later TASK proposes work that crosses a boundary,
it stops and goes to the Project Lead.

---

## 1. Milestone ↔ version

| Milestone | Version | Meaning |
|---|---|---|
| **M0** | (pre-release) | Spec, project bootstrap, architecture foundation, design system, infrastructure. Not user-visible. TASK-00…04. |
| **M1** | **V1** | Everything needed to mint, value, and trade an NFFC on Robinhood Chain — **including native crypto composition from day one**. This is the mainnet launch criterion. TASK-05…40. |
| **M1.5** | **V1.5** | Layers added once V1 has real traction: dynamic rarity earned over time, market-state view, native utility token. TASK-41…45. |
| **M2** | **V2** | Research only. No implementation without prior independent legal review. TASK-46…47. |

## 2. V1 (M1) — in scope

| Capability | TASK | Notes |
|---|---|---|
| Asset Identity + Representation registry (multi-provider) | TASK-05 | Allowlist only |
| **Robinhood adapter** | TASK-06 | Stock Tokens, official active list |
| **Crypto-native adapter** | TASK-07 | **BTC, ETH via Chainlink — V1, not later.** Same interface as Robinhood |
| Composition segmentation (crypto-only / stock-only / mixed) | TASK-08 | Derived automatically |
| NFFC ERC-721 core + composition invariants I1–I8 | TASK-09 | Immutable composition |
| Collections + configurable creation fee | TASK-10 | Fee scales with complexity |
| Metadata architecture (static vs. dynamic) | TASK-11 | Static immutable & independently verifiable |
| **Generative art engine** (composition → visual) | TASK-12 | Deterministic, public, reproducible |
| **Mint-condition trait engine** | TASK-13 | Weighted market state frozen at mint |
| **Static rarity engine** (composition concentration) | TASK-14 | On-chain-only inputs; no oracle |
| Dynamic NFFC UI/data | TASK-15 | Shows composition, reference value, performance, rarity, assets |
| Wallet (self-custody) + transaction state machine | TASK-16 | Robinhood Wallet + generic EVM |
| Create wizard (7 steps) | TASK-17 | Mixed asset selection on one surface |
| Mint flow (simulate → sign → confirm) | TASK-18 | No SUCCESS before confirmation |
| Marketplace contract (list / cancel / buy) | TASK-19 | `ReentrancyGuard`, configurable fee |
| Marketplace UI | TASK-20 | Server-first listing, indexed filters |
| NFFC detail page | TASK-21 | Public, shareable, `/nffc/[tokenId]` |
| Price Engine (Chainlink, provider-agnostic) | TASK-22 | Same engine for stocks and crypto |
| Reference NAV Engine | TASK-23 | Σ(weight × normalizedPrice); labeled "Reference NAV" |
| Blockchain indexer (idempotent) | TASK-24 | Recovers after downtime |
| Portfolio | TASK-25 | Owned NFFCs, reference value, performance, exposure |
| Activity | TASK-26 | On/off-chain timeline |
| Profiles (creator / collector) | TASK-27 | |
| Search (NFFCs, assets, collections, wallets) | TASK-28 | Partial-composition search |
| Offers (create / accept / cancel / expiry) | TASK-29 | Expiry enforced on-chain |
| Fee Engine (centralized config) | TASK-30 | Change fees without frontend deploy |
| Admin panel | TASK-31 | Sensitive actions via multisig |
| Security hardening (threat model, fuzzing) | TASK-32 | F1 recorded as open |
| Error handling unification | TASK-33 | |
| Responsive & accessibility | TASK-34 | |
| UI/UX polish | TASK-35 | |
| Testnet deployment + E2E | TASK-36 | Hosting platform chosen here |
| QA | TASK-37 | |
| Performance | TASK-38 | |
| Observability | TASK-39 | |
| Mainnet readiness gate | TASK-40 | Audit + multisig + legal review (F1, F2) |

## 3. V1.5 (M1.5) — explicitly NOT in V1

| Capability | TASK | Why it waits |
|---|---|---|
| **Dynamic performance badges** (second rarity axis: held through a drawdown, new high since mint, continuous-holding age) | TASK-41 | Needs oracle-based NAV history + indexed transfers accumulated over real time |
| **Market-State leaderboard** (NFFCs ranked by Reference NAV relative to mint) | TASK-42 | Copy + UI require legal review; framed as "market state", never "your investment return" |
| **Native utility token** — ERC-20 spec + contract | TASK-43 | Only after V1 security hardening is closed **and** prior legal review; audited before any public distribution |
| Token utility integration (fee discounts, whitelist access, light governance on non-critical params) | TASK-44 | Governance never touches security/custody params |
| Indexing/analytics expansion (subgraphs as redundancy) | TASK-45 | Additive, post-traction |

## 4. V2 (M2) — research only, blocked by design

| Capability | TASK | Gate |
|---|---|---|
| **Vaults / backed NFFC** (`NFFC → Vault → Stock Tokens`) | TASK-46 | Blocked. No implementation sub-task opens without: independent legal review of custody, asset control, economic rights; evidence of real V1/V1.5 traction; an audited vault design **before any deployment, even testnet** |
| Additional multi-provider adapters beyond Robinhood + crypto | TASK-47 | Only after demonstrated traction of TASK-06 and TASK-07 |

`NFFC_Whitepaper.md` §11: V2 is out of V1 precisely because it introduces custody, asset control, and
regulatory questions.

## 5. Boundary rules for execution

- A V1 TASK may add a **minimal interface** needed to keep the architecture extensible (e.g. the
  `IProviderAdapter` port), but may **not** implement V1.5/V2 behavior
  (`NFFC_Claude_Master_Prompt.md` v2.1 Rule 6, STEP 3).
- The static rarity engine (TASK-14) ships in V1; the dynamic badge engine (TASK-41) does not — even
  though the Whitepaper §16 describes both axes together.
- The crypto adapter (TASK-07) ships in V1; it is **not** a V1.5 add-on. Any doc or comment implying
  otherwise is stale (see the TASK-00 report KNOWN ISSUES).
- No custody of any kind in V1 — not of Stock Tokens, not of crypto, not of the NFFC
  (`NFFC_Claude_Master_Prompt.md` v2.1 Rule 3).
