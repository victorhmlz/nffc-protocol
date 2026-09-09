# 03 — System Architecture

**Source intent:** `NFFC_Whitepaper.md` v1.1 §5, §9; `NFFC_Roadmap.md` v1.1 Fase 02, Fase 04;
`NFFC_Development_Plan.md` v3.2 TASK-02, TASK-04; `NFFC_Claude_Master_Prompt.md` v2.1 "Stack fijado".

---

## 1. Fixed stack (not open to interpretation)

| Layer | Choice |
|---|---|
| Dapp / frontend | **Next.js (App Router) + TypeScript `strict`** — no explicit `any` without a justifying comment |
| API | Next.js **Route Handlers** — no separate Node/Express service |
| Contracts | Solidity + OpenZeppelin |
| Network | Robinhood Chain — L2 on Arbitrum, Chain ID **4663**, gas in ETH |
| Oracle | **Chainlink** — the single price source for both Stock Tokens and crypto |
| Wallets | **Self-custody only** — Robinhood Wallet + generic EVM via wagmi/viem. The protocol never implements or offers a custodial wallet |
| Index / cache | PostgreSQL (index/cache, never canonical ownership) + Redis |
| Indexer | Own, idempotent event indexer running outside the request cycle |
| Styling | Tailwind CSS |

## 2. High-level components

```
┌───────────────────────────────────────────────────────────────────────────┐
│                              Client (browser)                              │
│   Server Components (public, SEO)      Client Components (wallet/signing)   │
└───────────────┬───────────────────────────────────┬───────────────────────┘
                │ HTTP                               │ wallet RPC (wagmi/viem)
                ▼                                    ▼
┌───────────────────────────────┐        ┌───────────────────────────────────┐
│   Next.js App (App Router)    │        │        User's wallet + chain      │
│   - Server Components         │        │        Robinhood Chain (4663)      │
│   - Route Handlers (API)      │        └───────────────┬───────────────────┘
│   - reads: DB + cache + RPC   │                        │
└───────┬───────────────┬───────┘                        │
        │               │                                │
        ▼               ▼                                │
┌──────────────┐  ┌──────────────┐                       │
│ PostgreSQL   │  │   Redis      │                       │
│ (index/cache)│  │ (cache/locks)│                       │
└──────▲───────┘  └──────▲───────┘                       │
       │                 │                               │
┌──────┴─────────────────┴───────────────────────────────┴───────────────────┐
│                      Workers (outside request cycle)                        │
│   - Blockchain Indexer (idempotent)      TASK-24                            │
│   - Representation Sync (per provider)   TASK-06 / TASK-07                   │
│   - Price / NAV materialization          TASK-22 / TASK-23                   │
│   - Art rendering pipeline               TASK-12                            │
└──────┬─────────────────────────────────────────────────────┬───────────────┘
       │ RPC abstraction (multi-provider)                    │ Chainlink reads
       ▼                                                     ▼
┌───────────────────────────────┐        ┌───────────────────────────────────┐
│   Robinhood Chain RPC(s)      │        │   Chainlink price feeds (on 4663)  │
└───────────────────────────────┘        └───────────────────────────────────┘

On-chain contracts (Robinhood Chain 4663):
  AssetIdentityRegistry · RepresentationRegistry · RobinhoodAdapter · CryptoAdapter
  NFFC (ERC-721) · Collection · Marketplace · FeeConfig
```

## 3. Layering and the two agnosticism rules

The codebase is organized so that a **domain layer** sits below both the framework and any provider.

```
apps/web (Next.js)            ← may import domain; may import adapters' public interfaces
  ├─ app/ (Server + Client Components, Route Handlers)
  └─ ...
workers/                      ← may import domain; run outside Next.js
domain/                       ← imports NOTHING from Next.js, NOTHING provider-specific
  ├─ nffc/        (composition rules, invariants I1–I8)
  ├─ registry/    (Asset Identity / Representation model + validation)
  ├─ valuation/   (Reference NAV math)
  ├─ rarity/      (static rarity formula)
  └─ ports/       (interfaces: IProviderAdapter, IPriceOracle, IChainReader, IEventSource, …)
adapters/
  ├─ robinhood/   (implements domain ports for Robinhood; may import Robinhood specifics)
  └─ crypto/      (implements the SAME ports for native crypto)
config/           (env, chain params, no secrets)
```

> The exact package/monorepo boundary (single repo with path aliases vs. workspaces) is a
> **TASK-02** decision and will be recorded in the TASK-02 report. This file fixes the *dependency
> direction*, not the packaging.

**Rule A — framework-agnostic domain.** No module in `domain/` imports a Next.js API (no
`next/*`, no `next/headers`, no React). The domain is plain TypeScript. It is consumed by Route
Handlers, Server Components, and workers alike (`NFFC_Development_Plan.md` TASK-02 acceptance).

**Rule B — provider-agnostic domain.** No module in `domain/` imports `adapters/robinhood/*` or
`adapters/crypto/*`. The domain depends only on `domain/ports/*` interfaces. Robinhood and crypto
are wired in at the composition root (the app / worker entry points), never inside the domain
(`NFFC_Claude_Master_Prompt.md` v2.1 Rule 1).

**Consequence for diagrams:** in every architecture and domain diagram in this spec, "Robinhood"
appears only as one box behind `IProviderAdapter`, never inside the NFFC / registry / valuation
core.

## 4. Server vs. Client Components

| Concern | Rendering |
|---|---|
| Marketplace listing, NFFC detail (`/nffc/[tokenId]`), profiles, activity, search results | **Server-first** (Server Components + ISR). Renderable and shareable without a connected wallet. |
| Wallet connect, network switch, transaction signing, create-wizard submission, buy/offer actions | **Client Components.** Anything that touches a wallet or a signature is a Client Component. |
| Data reads for public surfaces | DB + Redis + (bounded) RPC via Route Handlers or Server Component data functions |
| Long-running work (indexing, sync, rendering, NAV history) | **Workers**, never a Route Handler held open |

Route Handlers are for short request/response work. Indexing and sync jobs (TASK-06, TASK-07,
TASK-24) run as workers on their own schedule/process (`NFFC_Development_Plan.md` TASK-02 acceptance).

## 5. RPC abstraction

- A single `IChainReader` / RPC-client port with **multiple configured providers** for Chain ID 4663,
  with failover and per-call timeouts. Not bound to one Robinhood Chain RPC URL
  (`NFFC_Development_Plan.md` TASK-04 acceptance).
- All chain reads for public surfaces go through this port so they can be cached, batched, and
  rate-limited centrally.
- Contract addresses and ABIs come from `config/`, keyed by environment.

## 6. Oracle integration

- Chainlink is the sole oracle in V1, read on Robinhood Chain, for **both** asset classes with no
  branching by class in layers above the Price Engine (`NFFC_Development_Plan.md` TASK-22).
- Every price value carries `{ raw, normalized, decimals, timestamp, source, multiplier }`. No layer
  consumes a price without source + timestamp.
- The Price Engine's data contract is designed so a second oracle provider can be added later without
  breaking consumers (TASK-22 acceptance).

## 7. Environments

- `dev` / `staging` / `production` environment management (`NFFC_Development_Plan.md` TASK-04).
- Secrets never in the repo; `.env.example` documents every required variable.
- Hosting: the Next.js dapp targets a Server-Components/ISR/Route-Handlers-capable platform (Vercel or
  equivalent), **separate** from the workers/indexer infrastructure — decided and configured in
  TASK-36, not now.

## 8. Data-flow examples

**Public NFFC detail render:** request → Server Component → domain `valuation` + repo reads from
PostgreSQL (composition, indexed ownership, latest NAV point) + Redis cache → HTML with ISR. No
wallet, no direct per-item on-chain loop.

**Mint:** Client Component → simulate via RPC → wallet signs → tx submitted → wallet state machine
tracks `SUBMITTED → CONFIRMING` → indexer observes the `Mint` event → DB updated → detail page
revalidated. `SUCCESS` shown only after confirmation.

**Representation sync:** provider sync worker → adapter pulls provider's official active list →
validates addresses → upserts `Representation` rows → marks delisted ones `INACTIVE` → registry
admin transactions as needed (guarded by role).
