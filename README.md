# NFFC Protocol

DApp for **Non-Fungible Financial Collectibles (NFFCs)** — ERC-721 tokens with an immutable,
weighted financial composition of verified on-chain asset representations. First network: Robinhood
Chain (Chain ID 4663). Robinhood Stock Tokens and native crypto (BTC, ETH via Chainlink) are both
supported providers from V1.

- Product & architecture spec: [`docs/spec/`](docs/spec/00-README.md)
- Engineering conventions: [`docs/conventions.md`](docs/conventions.md)
- Metadata architecture: [`docs/metadata-architecture.md`](docs/metadata-architecture.md)
- Generative art algorithm: [`docs/art-algorithm.md`](docs/art-algorithm.md)
- Mint-condition trait: [`docs/mint-condition-trait.md`](docs/mint-condition-trait.md)
- Static rarity: [`docs/static-rarity.md`](docs/static-rarity.md)
- Wallet integration: [`docs/wallet-integration.md`](docs/wallet-integration.md)
- Create wizard: [`docs/create-wizard.md`](docs/create-wizard.md) · live at `/create`
- Mint flow: [`docs/mint-flow.md`](docs/mint-flow.md) — Step 7 of the wizard
- Marketplace: [`docs/marketplace.md`](docs/marketplace.md) — `Marketplace.sol` (TASK-19)
- Marketplace UI: [`docs/marketplace-ui.md`](docs/marketplace-ui.md) · live at `/market`
- NFFC detail: [`docs/nffc-detail.md`](docs/nffc-detail.md) · live at `/nffc/[tokenId]`
- Price engine: [`docs/price-engine.md`](docs/price-engine.md) — `ChainlinkPriceOracle` (TASK-22)
- Reference NAV engine: [`docs/valuation.md`](docs/valuation.md) — NAV + performance windows (TASK-23)
- Design system: [`docs/design-system.md`](docs/design-system.md) · live at `/style-guide`
- Governance: `NFFC_Claude_Master_Prompt.md` (v2.4), `NFFC_Development_Plan.md` (v3.2),
  `NFFC_Whitepaper.md` (v1.1), `NFFC_Roadmap.md` (v1.1)
- Per-task reports: [`docs/reports/`](docs/reports/)
- Open issues log: [`docs/OPEN_ISSUES.md`](docs/OPEN_ISSUES.md) — live record of unresolved findings between TASKS

> **Status: Reference NAV engine (TASK-23).** Toolchain (TASK-01) → boundaries (TASK-02) → design
> system (TASK-03) → infrastructure (TASK-04) → registries (TASK-05) → Robinhood + crypto adapters
> (TASK-06/07) → composition segmentation (TASK-08) → NFFC ERC-721 core (TASK-09) → Collection
> contract (TASK-10) → metadata split (TASK-11) → generative art (TASK-12) → mint-condition trait
> (TASK-13) → static rarity (TASK-14) → dynamic NFFC UI (TASK-15) → wallet (TASK-16) → the 7-step
> create wizard (TASK-17) → the mint flow wired end-to-end (TASK-18) → `Marketplace.sol` (TASK-19)
> → `/market` explore/filter/sort/buy (TASK-20) → the NFFC detail page (TASK-21) → the price engine
> (TASK-22), and now **`computeReferenceNav` / `computePerformanceWindows`**: `Reference NAV =
> Σ(weight × normalizedPrice)`, persisted history (`price_point` / `nav_point`,
> `db/migrations/0002_price_nav.sql`) reproducible from the stored oracle prices, and performance
> windows in the exact shape TASK-15's UI already renders — orchestrated by
> `workers/nav-materializer/`, whose logic is complete and fully tested even though it has nothing
> to run against yet (no deployed registry, no token source) (`docs/valuation.md`). The indexer
> (TASK-24) and `Marketplace.sol`'s deployment (TASK-31) are still fixtures.

## Stack

|                 |                                                                                 |
| --------------- | ------------------------------------------------------------------------------- |
| Framework       | Next.js 16 (App Router), React 19, TypeScript `strict`                          |
| Wallet          | wagmi + viem, self-custody only (TASK-16) — `docs/wallet-integration.md`        |
| Styling         | Tailwind CSS v4 (tokens/components defined in TASK-03)                          |
| Package manager | pnpm (via Corepack) — version pinned in `package.json` `packageManager`         |
| Lint / format   | ESLint 9 (flat config, `eslint-config-next`, explicit `any` = error) + Prettier |
| Tests           | Vitest + Testing Library + jsdom                                                |
| CI              | GitHub Actions — lint · typecheck · test · build                                |

## Prerequisites

- **Node.js ≥ 22.13** (required by Hardhat 3; see `.nvmrc`; `nvm use` if you use nvm)
- **Corepack** (bundled with Node). Enable pnpm once:

  ```bash
  corepack enable
  ```

  If `corepack prepare` fails with a signature error on an older Node, update Corepack first:
  `npm install -g corepack@latest`.

## Setup

```bash
corepack enable          # first time only
pnpm install
cp .env.example .env.local   # dev/test need no variables; see the file for RPC/DB/Redis
```

`.env.example` documents every variable. `development` and `test` run with none of the
infrastructure configured; `staging`/`production` require `DATABASE_URL`, `REDIS_URL`, and
`RPC_4663_URLS` (validated by `infra/env.ts`).

## Scripts

| Command                | Does                                                                                        |
| ---------------------- | ------------------------------------------------------------------------------------------- |
| `pnpm dev`             | Start the dev server at http://localhost:3000                                               |
| `pnpm build`           | Production build                                                                            |
| `pnpm start`           | Serve the production build                                                                  |
| `pnpm lint`            | ESLint                                                                                      |
| `pnpm lint:fix`        | ESLint with `--fix`                                                                         |
| `pnpm format`          | Prettier write                                                                              |
| `pnpm format:check`    | Prettier check (CI)                                                                         |
| `pnpm typecheck`       | `next typegen` then `tsc --noEmit`                                                          |
| `pnpm test`            | Vitest (run once)                                                                           |
| `pnpm test:watch`      | Vitest (watch)                                                                              |
| `pnpm db:migrate`      | Apply `db/migrations/*.sql` (`--dry-run` to preview). Needs `DATABASE_URL`.                 |
| `pnpm worker <path>`   | Run a worker, e.g. `pnpm worker workers/robinhood-sync/index.ts` (via `tsx`; Node ≥ 22.13). |
| `pnpm contracts:build` | Compile `contracts/` (Hardhat 3). Needs Node ≥ 22.13.                                       |
| `pnpm contracts:test`  | Run the Solidity tests (`contracts/*.t.sol`).                                               |
| `pnpm verify`          | lint → typecheck → test → build (JS/TS gate; contracts are a separate CI job)               |

## Layout

```
src/app/            Next.js App Router; Server-first, Client Components only for wallet/signing
src/app/api/        Route Handlers (short request/response only — see docs/conventions.md §3)
src/components/ui/  design-system primitives (TASK-03)
src/lib/            cn(), wallet state machine types, shared client helpers
domain/             framework- and provider-agnostic core: types + ports/ interfaces
adapters/           per-provider adapters (one shared interface) + provider-adapter registry
infra/              server-only runtime plumbing: env, logger, RPC, PostgreSQL, Redis, health (TASK-04)
config/             typed configuration; fixed chain facts
workers/            long-running / scheduled processes, outside the Next request cycle
                    (provider-sync engine + robinhood-sync / crypto-sync — TASK-06/07)
contracts/          Solidity — Hardhat 3; registries (TASK-05) + Robinhood/Crypto adapters (TASK-06/07)
db/                 PostgreSQL migrations + runner (TASK-04)
docs/spec/          product & architecture specification (TASK-00)
docs/conventions.md module boundaries, Server/Client rules, test layout (TASK-02)
docs/design-system.md  tokens, components, theming, responsive rules (TASK-03)
docs/reports/       TASK-XX-REPORT.md per task
.github/workflows/  CI
```

Import via path aliases: `@/*` → `src/*`, `@domain/*`, `@adapters/*`, `@infra/*`, `@config/*`,
`@workers/*`. The dependency direction (`domain` ← `config`/`infra`/`adapters` ← `src`/`workers`) is
one-way and enforced by ESLint (`docs/conventions.md` §1).

## Contributing / task workflow

Each TASK follows `INSPECT → PLAN → IMPLEMENT → TEST → AUDIT → PULL REQUEST → REPORT`
(`NFFC_Claude_Master_Prompt.md` v2.1). One branch per task (`task/TASK-XX-slug`), one PR against
`main`, not self-merged. A TASK is not `COMPLETED` if `pnpm verify` is not green.
