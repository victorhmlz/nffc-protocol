# 02 — Domain Model

**Source intent:** `NFFC_Whitepaper.md` v1.1 §3–6, §16; `NFFC_Development_Plan.md` v3.2 TASK-05,
TASK-08, TASK-09, TASK-14.

This document defines the domain in terms independent of any framework, any provider, and any
specific blockchain. Implementation lands in later TASKS; here we fix *what the concepts are* and
*what must always be true*.

---

## 1. The mandated layering

```
                 ┌───────────────────────────────────────────────┐
                 │                    NFFC                        │
                 │   ERC-721 token + immutable composition        │
                 │   (1..20 components, weights in BPS, Σ=10000)  │
                 └───────────────────────┬───────────────────────┘
                                         │ each component references
                                         ▼
                 ┌───────────────────────────────────────────────┐
                 │              Asset Abstraction                 │
                 │   Asset Identity  ──represented by──►  ...     │
                 └───────────────────────┬───────────────────────┘
                                         │ resolved through
                                         ▼
                 ┌───────────────────────────────────────────────┐
                 │          Provider / Network Adapter            │
                 │   Robinhood Adapter │ Crypto Adapter │ (3rd…)  │
                 │   ── peers, no hierarchy ──                    │
                 └───────────────────────┬───────────────────────┘
                                         │ produces / verifies
                                         ▼
                 ┌───────────────────────────────────────────────┐
                 │                Representation                  │
                 │   a specific verified on-chain token on a      │
                 │   specific Network, with decimals, multiplier, │
                 │   status, oracle metadata                      │
                 └───────────────────────────────────────────────┘
```

The NFFC core knows only about **Asset Identity references** and **weights**. It never imports,
names, or branches on Robinhood or on crypto. Everything provider-specific lives in an adapter,
behind the registry. See `05-adapter-architecture.md`.

## 2. Entities

### 2.1 Asset Identity

**What economic thing is being referenced.** Provider-independent, network-independent.

| Field | Meaning |
|---|---|
| `assetId` | Stable internal identifier (opaque; not an address) |
| `symbol` | Canonical symbol, e.g. `NVDA`, `BTC` |
| `name` | Human name, e.g. `NVIDIA Corporation`, `Bitcoin` |
| `assetClass` | e.g. `EQUITY`, `CRYPTO` (extensible; used for segmentation, never for privileged logic) |
| `status` | `ACTIVE` / `INACTIVE` at the identity level |

An Asset Identity is **not** a token and has **no** contract address. `NVDA` the company is one
Asset Identity; it may be represented by several different tokens from several providers.

### 2.2 Provider

**Who issues or defines a representation, and under what terms.**

| Field | Meaning |
|---|---|
| `providerId` | Stable identifier, e.g. `ROBINHOOD`, `CRYPTO_NATIVE` |
| `name` | Human name |
| `kind` | Descriptive only (`REGULATED_BROKER`, `NATIVE_CRYPTO`, …) — not a switch for core logic |
| `status` | `ACTIVE` / `INACTIVE` |
| `adapter` | Reference to the on-chain/off-chain adapter that manages this provider's representations |

Providers are peers. Adding a provider is a registry operation plus a new adapter; it must not
require a change to `NFFC.sol` or to the core domain (`NFFC_Development_Plan.md` TASK-05, TASK-47).

### 2.3 Network

**Which chain a representation lives on.**

| Field | Meaning |
|---|---|
| `chainId` | e.g. `4663` (Robinhood Chain) |
| `name` | e.g. `Robinhood Chain` |
| `nativeGasSymbol` | e.g. `ETH` |
| `status` | `ACTIVE` / `INACTIVE` |

V1 uses Chain ID 4663 only, but Network is a first-class entity so the model does not have to change
when a second network is added.

### 2.4 Representation

**A specific, verified, on-chain token that stands for an Asset Identity, via a Provider, on a
Network.**

| Field | Meaning |
|---|---|
| `representationId` | Stable identifier |
| `assetId` | The Asset Identity this represents |
| `providerId` | The Provider |
| `chainId` | The Network |
| `tokenAddress` | The verified ERC-20 (or equivalent) contract address |
| `tokenStandard` | e.g. `ERC20` |
| `decimals` | Token decimals |
| `multiplier` | Scaling factor between token units and one unit of the underlying (e.g. fractional-share ratio); default 1 |
| `oracleMetadata` | Oracle source descriptor (Chainlink feed identifier, heartbeat, decimals) — see `05-adapter-architecture.md` |
| `status` | `ACTIVE` / `INACTIVE` (auto-set `INACTIVE` when the provider delists — TASK-06) |
| `createdAt`, `updatedAt` | Timestamps |

A Representation is admitted **only** by the registry, **only** for a verified address, **only** by an
administrative role. A user-supplied address is never promoted to a supported asset
(`NFFC_Claude_Master_Prompt.md` v2.1 Rule 2).

### 2.5 NFFC

**The ERC-721 token and its immutable composition.**

| Field | Meaning |
|---|---|
| `tokenId` | ERC-721 token id |
| `collectionId` | The Collection it belongs to |
| `creator` | Address that minted it |
| `owner` | Current owner (on-chain source of truth; DB is index only) |
| `composition` | Ordered list of `Component` (see below), fixed forever at mint |
| `segment` | Derived: `CRYPTO_ONLY` / `STOCK_ONLY` / `MIXED` (TASK-08) — computed from `composition`, never declared |
| `staticRarity` | Derived at mint from composition concentration (TASK-14) |
| `mintConditionTrait` | Weighted market-state snapshot frozen at mint (TASK-13) |
| `artURI` | Pointer to the generative art produced from `composition` (TASK-12) |
| `mintedAt` | Timestamp / block |

**Component**

| Field | Meaning |
|---|---|
| `assetId` | Reference to a registered Asset Identity |
| `representationId` | The specific Representation chosen for valuation at mint time |
| `weightBps` | Weight in basis points, `> 0` |

### 2.6 Collection

**A creator-owned grouping of NFFCs.**

| Field | Meaning |
|---|---|
| `collectionId` | Identifier |
| `creator` / `owner` | Creator address |
| `name`, `metadata` | Collection-level metadata |
| `createdAt` | Timestamp |
| Creation is subject to the **collection creation fee**, which scales with composition complexity (`06-fee-model.md`). |

## 3. Asset Identity ≠ Representation

This distinction is load-bearing and is stated here explicitly, as TASK-00 acceptance requires.

- **Asset Identity** answers *"what economic thing?"* — `NVDA`, `BTC`. It has no address, no chain,
  no price of its own, no jurisdiction.
- **Representation** answers *"which exact token, from whom, on which chain, with what decimals,
  multiplier, oracle, and status?"*

One Asset Identity can have **many** Representations:

```
Asset Identity: NVDA
├── Representation A: provider ROBINHOOD, chain 4663, token 0xAAA…, decimals 18, multiplier 1,
│                     oracle Chainlink NVDA/USD, status ACTIVE
└── Representation B: (hypothetical future) provider OTHER, chain 4663, token 0xBBB…, different
                      rights / price / jurisdiction
```

Consequences the model must honor:

1. Two providers may price the same Asset Identity differently, with different rights and different
   geographic restrictions. Valuation is always done against a **Representation**, never against an
   Asset Identity in the abstract.
2. An NFFC `Component` pins **both** `assetId` and `representationId`. The composition is immutable,
   so the chosen Representation at mint is part of the historical record even if it is later
   deactivated.
3. Segmentation (`CRYPTO_ONLY` / `STOCK_ONLY` / `MIXED`) is derived from the `assetClass` /
   `providerId` of each component's Representation, automatically.

## 4. NFFC composition invariants

Enforced by `NFFC.sol` at mint (TASK-09). None may be relaxed by any role, ever.

| # | Invariant |
|---|---|
| I1 | `1 ≤ components.length ≤ 20` |
| I2 | `Σ weightBps == 10000` exactly |
| I3 | No duplicate `assetId` within one NFFC |
| I4 | `weightBps > 0` for every component |
| I5 | Every `representationId` is registered **and** `ACTIVE` in the registry at mint time |
| I6 | Every `representationId` resolves to the component's `assetId` |
| I7 | Composition is immutable after mint — no function, under any role, can add, remove, reweight, or re-point a component |
| I8 | A complete event is emitted at mint capturing the full composition |

Edge cases that must have explicit tests (TASK-09): exactly 1 component; exactly 20 components;
`Σ weightBps` of 9999 and 10001; duplicate asset; zero weight; unregistered representation;
representation registered but `INACTIVE`; a mix of providers in one NFFC.

## 5. Relationships (ER view)

```
AssetIdentity 1───* Representation *───1 Provider
                         │
                         *───1 Network
Collection 1───* NFFC 1───* Component *───1 Representation
                                       *───1 AssetIdentity
NFFC 1───1 Segment (derived)
NFFC 1───1 StaticRarity (derived at mint)
NFFC 1───1 MintConditionTrait (frozen at mint)
```

## 6. What is deliberately not in the domain model (V1)

- **Vault / custody entities** — V2 only (`10-version-boundaries.md`).
- **Native token / governance entities** — V1.5 only.
- **Dynamic performance badges** — V1.5 (`NFFC_Whitepaper.md` §16 dynamic axis, TASK-41).
- **Off-chain "portfolio" as an owned entity** — portfolio is a *view* computed from on-chain
  ownership + indexed data, not a stored object of record (`09-data-model.md`).
