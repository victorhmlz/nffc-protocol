# NFFC Protocol

DApp for **Non-Fungible Financial Collectibles (NFFCs)** — ERC-721 tokens with an immutable,
weighted financial composition of verified on-chain asset representations. First network: Robinhood
Chain (Chain ID 4663). Robinhood Stock Tokens and native crypto (BTC, ETH via Chainlink) are both
supported providers from V1.

- Product & architecture spec: [`docs/spec/`](docs/spec/00-README.md)
- Governance: `NFFC_Claude_Master_Prompt.md` (v2.1), `NFFC_Development_Plan.md` (v3.2),
  `NFFC_Whitepaper.md` (v1.1), `NFFC_Roadmap.md` (v1.1)
- Per-task reports: [`docs/reports/`](docs/reports/)

> **Status: bootstrap (TASK-01).** This repository currently contains only project infrastructure —
> Next.js + TypeScript toolchain, linter, formatter, test runner, CI. No domain code yet. Module
> directories (`domain/`, `adapters/`, `workers/`, `config/`) are intentionally empty and populated
> from TASK-02 onward.

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
src/app/            Next.js App Router (Server-first; Client Components only for wallet/signing)
domain/             framework- and provider-agnostic core          (TASK-02+)
adapters/           per-provider adapters, one shared interface     (TASK-06 / TASK-07)
workers/            indexer, sync, materialization — off request cycle (TASK-24 / TASK-06 / TASK-07)
config/             typed env-keyed configuration, no secrets       (TASK-04+)
docs/spec/          product & architecture specification
docs/reports/       TASK-XX-REPORT.md per task
.github/workflows/  CI
```

## Contributing / task workflow

Each TASK follows `INSPECT → PLAN → IMPLEMENT → TEST → AUDIT → PULL REQUEST → REPORT`
(`NFFC_Claude_Master_Prompt.md` v2.1). One branch per task (`task/TASK-XX-slug`), one PR against
`main`, not self-merged. A TASK is not `COMPLETED` if `pnpm verify` is not green.
