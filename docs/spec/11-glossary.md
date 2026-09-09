# 11 — Glossary

Canonical English terms for NFFC Protocol. Use these exact terms in code, comments, UI copy, and
documents. Where the governance docs use a Spanish term, the mapping is given.

---

| Term | Definition | Spanish (governance docs) |
|---|---|---|
| **NFFC** | Non-Fungible Financial Collectible. An ERC-721 token whose identity embeds an immutable financial composition. | NFFC |
| **Composition** | The ordered set of 1–20 `Component`s of an NFFC, fixed forever at mint. | composición |
| **Component** | One entry in a composition: an `assetId`, a `representationId`, and a `weightBps > 0`. | componente |
| **BPS / basis points** | Weight unit. All component weights in one NFFC sum to exactly `10000` (100%). | basis points / BPS |
| **Asset Identity** | The economic thing referenced (e.g. `NVDA`, `BTC`). Provider- and network-independent. No address. | Asset Identity |
| **Asset Representation** / **Representation** | A specific, verified on-chain token that stands for an Asset Identity, via a Provider, on a Network — with decimals, multiplier, oracle metadata, status. | representación / Asset Representation |
| **Blockchain Token** | The concrete contract (ERC-20 or equivalent) where a Representation exists. | Blockchain Token |
| **Provider** | Who issues or defines a Representation and under what terms (e.g. `ROBINHOOD`, `CRYPTO_NATIVE`). Providers are peers. | proveedor / provider |
| **Network** | The chain a Representation lives on (e.g. Robinhood Chain, Chain ID 4663). | red / network |
| **Provider / Network Adapter** / **Adapter** | The component (on-chain contract + off-chain sync worker) that integrates one Provider behind the shared `IProviderAdapter` interface. | adapter |
| **Registry** | The on-chain `AssetIdentityRegistry` + `RepresentationRegistry`; the allowlist authority. | registry |
| **Allowlist** | The principle that only registry-verified Representations are usable; no user-supplied address is auto-supported. | allowlist |
| **Collection** | A creator-owned grouping of NFFCs; subject to the collection creation fee. | colección |
| **Reference NAV** / **Reference Value** | `Σ(weightᵢ × normalizedPriceᵢ)` over a composition. Informational only; not backing. Always labeled "Reference", never bare "value". | Reference NAV / Reference Value / valoración de referencia |
| **Normalized price** | An oracle price after applying `decimals` and `multiplier`, carrying `source` and `timestamp`. | precio normalizado |
| **Multiplier** | The scaling factor between one token unit of a Representation and one unit of its underlying (e.g. fractional-share ratio). | multiplicador |
| **Oracle** | Chainlink in V1 — the single price source for both Stock Tokens and crypto. | oráculo |
| **Segment** / **Composition Segment** | The auto-derived label of an NFFC: `CRYPTO_ONLY`, `STOCK_ONLY`, or `MIXED`. Never user-set. | segmentación de composición |
| **Static Rarity** | The birth rarity of an NFFC, computed at mint from composition concentration (fewer components / more weight concentration = rarer). On-chain inputs only. V1. | Motor de Rareza Estática / rareza estática |
| **Dynamic Badge** / **Performance Badge** | The second, time-earned rarity axis (held through a drawdown, new high since mint, holding age). **V1.5**, not V1. | Motor de Badges de Desempeño Dinámico / rareza dinámica |
| **Mint Condition Trait** | An immutable record of the weighted market state at the instant of mint (e.g. distance from all-time highs of the weighted set). V1. | trait de condición de mercado al mint |
| **Generative Art** | The NFFC's artwork, produced procedurally and deterministically from its real basis-point weights. Public and reproducible. V1. | arte generativo |
| **Market State** | The V1.5 aggregate view ranking circulating NFFCs by Reference NAV relative to mint. Framed as market information, never as investment-return promotion. | Estado del Mercado |
| **Self-custody** | Every supported wallet holds the user's own keys; the protocol never implements or offers custody of keys, funds, or NFFCs. | autocustodia |
| **Vault** | A V2 research concept (`NFFC → Vault → Stock Tokens`) for a backed NFFC. Blocked by design in V1/V1.5. | vault |
| **Robinhood Chain** | The first Network. L2 on Arbitrum, Chain ID 4663, gas in ETH. | Robinhood Chain |
| **Robinhood Stock Token** | A tokenized-equity Representation issued by the Robinhood provider. | Robinhood Stock Token |
| **Transaction State Machine** | `IDLE → AWAITING_WALLET → SIGNING → SUBMITTED → CONFIRMING → SUCCESS / FAILED / REJECTED`. No state is skipped; `SUCCESS` only after on-chain confirmation. | máquina de estados de transacción |
| **Indexer** | The idempotent worker that mirrors on-chain events into PostgreSQL. The database is index/cache, never the ownership authority. | indexer |
| **Reference NAV Engine** | The service (TASK-23) that computes and persists Reference NAV, current and historical. | NAV Engine |
| **Price Engine** | The provider-agnostic service (TASK-22) that normalizes oracle prices into `{ raw, normalized, decimals, timestamp, source, multiplier }`. | Price Engine / Motor de Precios |
| **V1 / V1.5 / V2** | Release lines. V1 = M1 (mainnet launch). V1.5 = M1.5 (identity & utility). V2 = M2 (vaults; research only). | V1 / V1.5 / V2 |
| **F1 / F2 / F3** | The carried open regulatory/geographic/framing findings (`08-security-principles.md` §4). | — |
