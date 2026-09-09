# NFFC Protocol

DApp for **Non-Fungible Financial Collectibles (NFFCs)** — ERC-721 tokens with an immutable,
weighted financial composition of verified on-chain asset representations. First network: Robinhood
Chain (Chain ID 4663). Robinhood Stock Tokens and native crypto (BTC, ETH via Chainlink) are both
supported providers from V1.

- Product & architecture spec: [`docs/spec/`](docs/spec/00-README.md)
- Engineering conventions: [`docs/conventions.md`](docs/conventions.md)
- Governance: `NFFC_Claude_Master_Prompt.md` (v2.1), `NFFC_Development_Plan.md` (v3.2),
  `NFFC_Whitepaper.md` (v1.1), `NFFC_Roadmap.md` (v1.1)
- Per-task reports: [`docs/reports/`](docs/reports/)

> **Status: architecture foundation (TASK-02).** Toolchain (TASK-01) plus the module skeleton and
> boundaries: `domain/` (types + `ports/` interfaces), `adapters/` (registry + shared interface),
> `config/`, `workers/` (harness). No domain behaviour yet — validators, NAV math, adapters, and
> rarity land in later TASKS.

## Stack

| | |
|---|---|
| Framework | Next.js 16 (App Router), React 19, TypeScript `strict` |
| Styling | Tailwind CSS v4 (tokens/components defined in TASK-03) |
| Package manager | pnpm (via Corepack) — version pinned in `package.json` `packageManager` |
| Lint / format | ESLint 9 (flat config, `eslint-config-next`, explicit `any` = error) + Prettier |
| Tests | Vitest + Testing Library + jsdom |
| CI | GitHub Actions — lint · typecheck · test · build |

## Prerequisites

- **Node.js ≥ 20.9** (this repo targets Node 22 — see `.nvmrc`; `nvm use` if you use nvm)
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
cp .env.example .env.local   # no variables are required for TASK-01
```

## Scripts

| Command | Does |
|---|---|
| `pnpm dev` | Start the dev server at http://localhost:3000 |
| `pnpm build` | Production build |
| `pnpm start` | Serve the production build |
| `pnpm lint` | ESLint |
| `pnpm lint:fix` | ESLint with `--fix` |
| `pnpm format` | Prettier write |
| `pnpm format:check` | Prettier check (CI) |
| `pnpm typecheck` | `next typegen` then `tsc --noEmit` |
| `pnpm test` | Vitest (run once) |
| `pnpm test:watch` | Vitest (watch) |
| `pnpm verify` | lint → typecheck → test → build (same gate as CI) |

## Layout

```
src/app/            Next.js App Router; Server-first, Client Components only for wallet/signing
src/app/api/        Route Handlers (short request/response only — see docs/conventions.md §3)
domain/             framework- and provider-agnostic core: types + ports/ interfaces
adapters/           per-provider adapters (one shared interface) + provider-adapter registry
config/             typed configuration; fixed chain facts. Loader is TASK-04
workers/            long-running / scheduled processes, outside the Next request cycle
docs/spec/          product & architecture specification (TASK-00)
docs/conventions.md module boundaries, Server/Client rules, test layout (TASK-02)
docs/reports/       TASK-XX-REPORT.md per task
.github/workflows/  CI
```

Import via path aliases: `@/*` → `src/*`, `@domain/*`, `@adapters/*`, `@config/*`, `@workers/*`.
The `domain → adapters → src/workers` dependency direction is one-way and enforced by ESLint
(`docs/conventions.md` §1).

## Contributing / task workflow

Each TASK follows `INSPECT → PLAN → IMPLEMENT → TEST → AUDIT → PULL REQUEST → REPORT`
(`NFFC_Claude_Master_Prompt.md` v2.1). One branch per task (`task/TASK-XX-slug`), one PR against
`main`, not self-merged. A TASK is not `COMPLETED` if `pnpm verify` is not green.
