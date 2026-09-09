# TASK 04 REPORT

## STATUS

COMPLETED

Local gate `pnpm verify` (lint · typecheck · test · build) is green. The GitHub Actions CI result
on PR #5 is recorded in the PULL REQUEST section.

## OBJECTIVE

Runtime infrastructure (`NFFC_Development_Plan.md` v3.2 TASK-04; `docs/spec/03-architecture.md` §5,
§7): environment management (dev/staging/prod), a **multi-provider** RPC abstraction to Robinhood
Chain (4663), PostgreSQL + Redis connections, structured logging + error boundaries, and test
infrastructure (unit / integration / contract).

## CHANGES

- **New module `infra/`** — `server-only` runtime plumbing; ESLint boundary added
  (`infra/**` may import `domain/`, `config/`; not `src/`, `adapters/`, `workers/`, `next`).
  `@infra` / `@infra/*` path aliases (`tsconfig`, `vitest`).
- **`infra/env.ts`** — zod loader → typed `AppConfig`. `getConfig()` (cached), `loadConfigFrom(env)`
  and `resetConfigCache()` (tests). `APP_ENV` selects the environment; `staging`/`production`
  **require** `DATABASE_URL`, `REDIS_URL`, and `RPC_4663_URLS`, `development`/`test` tolerate their
  absence. RPC endpoints are a comma-separated list; the log level defaults per environment. Throws
  `ConfigError` with a readable message on invalid/missing env.
- **`infra/rpc/chain-reader.ts`** — implements the TASK-02 `ChainReader` port over a **viem
  `fallback` transport**: the first endpoint is primary, the rest are automatic failover, so the
  reader is **not coupled to any single Robinhood Chain RPC** (TASK-04 acceptance).
  `readContract` parses a human-readable ABI signature (`parseAbiItem`); per-call timeout;
  `RpcConfigError` for no-endpoint / non-function-signature misuse.
- **`infra/logging/logger.ts`** — a `Logger` interface (the codebase depends on it, not on pino)
  with a pino implementation: level from config, key redaction (`authorization`, `cookie`,
  `password`, `token`, `privateKey`, `DATABASE_URL`, `REDIS_URL`, …), `child()` bindings. Plain
  JSON to stdout — no transport worker (keeps Turbopack out of `thread-stream`); pipe through
  `pino-pretty` for readable local output.
- **`infra/db/pool.ts`** — lazy `pg.Pool` (no connection on import); `query()`, `withTransaction()`,
  `pingDb()` (never throws), `closePool()`. `DatabaseNotConfiguredError` when called without a
  database configured.
- **`infra/redis/client.ts`** — lazy `ioredis` client (`lazyConnect`, `enableOfflineQueue: false`);
  `pingRedis()` (never throws), `closeRedis()`. `RedisNotConfiguredError`.
- **`infra/health.ts`** — `checkHealth()`: independent per-dependency probe (database / redis /
  RPC), each `ok` / `down` / `not_configured`; `not_configured` is not a failure, so `status` is
  `degraded` only when something configured is down. Ping functions are injectable for tests.
- **`db/`** — `db/migrations/0001_init.sql` (infrastructure bookkeeping only: `schema_migrations`,
  `sync_cursor` — domain tables ship with their TASKS per `docs/spec/09-data-model.md`),
  `db/migrate.mjs` (forward-only runner, plain Node ESM so it needs no `tsx`; each migration in its
  own transaction; re-run is a no-op; `--dry-run`), `pnpm db:migrate`, `db/README.md`.
- **Next error boundaries** — `src/app/error.tsx` (route-segment, styled with the design system),
  `src/app/global-error.tsx` (last-resort, dependency-free, renders its own `<html>`),
  `src/app/not-found.tsx` (styled).
- **`src/app/api/ready/route.ts`** — readiness probe: `checkHealth()`, 200 when ok / 503 when
  degraded. `/api/health` stays the dependency-free liveness probe.
- **`config/types.ts`** — `database` and `redis` on `AppConfig` are now `… | null` (the TASK-02
  file was explicitly provisional pending this loader). Doc comment points at `infra/env.ts`.
- **`.env.example`** — every variable documented, with the dev/test vs. staging/production rule.
- **Test infrastructure** — `tests/support/fakes.ts` (`createFakeChainReader`, `FakeClock`,
  `createFakeLogger`), `tests/support/chain-reader-contract.ts` (`runChainReaderContract` — a shared
  suite any `ChainReader` must pass), `tests/support/noop.ts` (Vitest `server-only` stub).
  `docs/conventions.md` §1 and §4 updated (infra row, dependency arrows, the `// @vitest-environment
  node` convention, contract-suite convention, "no test connects to Postgres/Redis").
- 6 runtime deps: `zod`, `viem`, `pg`, `ioredis`, `pino`, `server-only`; 1 dev dep: `@types/pg`.
  `pnpm-workspace.yaml` records a `minimumReleaseAgeExclude` for `zod@4.6.0` (fresh release, allowed
  through the supply-chain policy at add time).

## FILES CREATED

```
infra/README.md
infra/env.ts
infra/env.test.ts
infra/health.ts
infra/health.test.ts
infra/index.ts
infra/logging/index.ts
infra/logging/logger.ts
infra/logging/logger.test.ts
infra/db/index.ts
infra/db/pool.ts
infra/redis/index.ts
infra/redis/client.ts
infra/rpc/index.ts
infra/rpc/chain-reader.ts
infra/rpc/chain-reader.test.ts
db/README.md
db/migrate.mjs
db/migrations/0001_init.sql
src/app/error.tsx
src/app/global-error.tsx
src/app/not-found.tsx
src/app/api/ready/route.ts
tests/support/fakes.ts
tests/support/chain-reader-contract.ts
tests/support/noop.ts
docs/reports/TASK-04-REPORT.md
```

## FILES MODIFIED

```
.env.example         all TASK-04 variables + the dev/test vs staging/prod rule
README.md            status, layout (infra/, db/), db:migrate script, env note
config/types.ts      database/redis → `… | null`
docs/conventions.md  §1 boundaries (infra), §4 test infra (node env, contracts, no live DB)
eslint.config.mjs    infra/** import boundary; ignore db/migrate.mjs
package.json          6 runtime deps + @types/pg; db:migrate script
pnpm-lock.yaml        lockfile
pnpm-workspace.yaml   minimumReleaseAgeExclude: zod@4.6.0; tidied override comments
tsconfig.json         @infra / @infra/* aliases
vitest.config.ts      @infra alias; infra/** include; server-only → noop stub
vitest.setup.ts       default APP_ENV=test for quiet ambient config
```

Branch is based on `task/TASK-03-design-system` (stacked — see PULL REQUEST).

## TESTS

`pnpm test` → Vitest, **13 files, 35 tests, all pass**. New for TASK-04:

```
✓ infra/env.test.ts (6)            defaults; CSV RPC parsing; db/redis; production strictness; bad URL; bad APP_ENV
✓ infra/logging/logger.test.ts (2) Logger interface + cache; child() + logging doesn't throw
✓ infra/health.test.ts (2)         not_configured ⇒ ok overall; configured-but-down ⇒ degraded
✓ infra/rpc/chain-reader.test.ts (6)  ChainReader contract (fake); no-endpoint throws; block number
                                       over one endpoint; FAILOVER to the next endpoint; non-function
                                       signature rejected
```

- Every `infra/` test runs with `// @vitest-environment node`.
- The RPC test stubs `fetch` with canned JSON-RPC — it does **not** hit a network. The failover
  case proves the multi-provider acceptance criterion: endpoint A rejects, endpoint B answers,
  `getBlockNumber()` still resolves.
- No test connects to PostgreSQL or Redis (that is integration — TASK-31/37, gated behind real
  services). `checkHealth` is tested with injected ping functions; the pool/client are unit-covered
  only for their "not configured" guards via typecheck + the health test.

## BUILD

`pnpm build` → Next.js 16.3.4 (Turbopack): compiled, TypeScript checked, 5 routes:

```
┌ ○ /                  (Static)
├ ○ /_not-found        (Static)
├ ƒ /api/health        (Dynamic)
├ ƒ /api/ready         (Dynamic)   ← new readiness probe
└ ○ /style-guide       (Static)
```

`pg`, `ioredis`, `pino`, and `viem` bundle into the server routes without pulling into the client
bundle or breaking the static prerender of `/` and `/style-guide` — the `server-only` guards + the
fact that only Route Handlers import `@infra` hold the line.

## LINT / TYPECHECK

- `pnpm lint` → ESLint 9, clean. `infra/**` boundary rule added; `db/migrate.mjs` (an ops script)
  is in `globalIgnores`.
- `pnpm typecheck` → `next typegen` + `tsc --noEmit` (`strict` + `noUncheckedIndexedAccess`). Clean.
  One fix during development: `loadConfigFrom` / `build` accept `Readonly<Record<string, string |
  undefined>>` rather than `NodeJS.ProcessEnv` (Next augments `ProcessEnv` to require `NODE_ENV`,
  which tests should not have to supply).
- `pnpm format:check` (source) clean.

## SECURITY

STEP 5 AUDIT:

- **RPC multi-provider** — the headline acceptance criterion — is implemented (`fallback`
  transport) **and verified by a failover test**, not just asserted.
- **Secrets** — none in the repo. `.env.example` has only placeholders. `.gitignore` excludes
  `.env*` except `.env.example` (TASK-01). The logger **redacts** `authorization`, `cookie`,
  `password`, `secret`, `token`, `privateKey`, `DATABASE_URL`, `REDIS_URL` and their nested forms.
- **Fail-fast config** — `infra/env.ts` throws `ConfigError` on a missing/invalid required variable
  in `staging`/`production`, so a misconfigured deploy stops at boot rather than half-working.
- **`server-only`** on every `infra` barrel — a `"use client"` module that imports infra fails the
  build with a clear message (belt to the ESLint-boundary braces).
- **DB is index/cache, never ownership authority** — carried forward from `docs/spec/09-data-model.md`;
  `0001_init` adds no domain tables, only bookkeeping.
- **No custom crypto, no `tx.origin`** — N/A here (no contracts); viem is the audited RPC/ABI layer.
- **`dangerouslySetInnerHTML`** — only in `ThemeScript` (TASK-03); the new error boundaries use no
  inline scripts. CSP nonce note for `ThemeScript` is already recorded for TASK-32.
- New deps are mainstream, widely-audited: `zod`, `viem` (the mandated stack), `pg`, `ioredis`,
  `pino`, `server-only`. `pnpm` reported the lockfile passes supply-chain policies.

## PERFORMANCE

Not a perf TASK (TASK-38). Choices that matter later: lazy DB pool + lazy Redis (no connections on
import, so build/CI/tests pay nothing); pooled Postgres with bounded `max` + idle timeout; Redis
`enableOfflineQueue: false` + `maxRetriesPerRequest: 2` (fail fast rather than pile up); RPC
`fallback` with `retryCount: 0` (move to the next endpoint instead of hammering a dead one);
structured JSON logs (cheap, no pretty-print worker in production).

## KNOWN ISSUES

1. **`BlockchainEventSource` port (TASK-02) is not implemented here.** TASK-04 implements the read
   path (`ChainReader`) used by the app; the event stream for the indexer — with reorg handling and
   idempotent resume — is built with the indexer in TASK-24, against `sync_cursor` (created by
   `0001_init`).
2. **No integration tests against real PostgreSQL/Redis** in CI. The connection code is exercised
   only for its guards. A docker-compose / testcontainers integration lane is TASK-31/37 territory;
   `runChainReaderContract` is already structured to be re-run against the real viem client from
   there.
3. **`config/types.ts` shape change** (`database`/`redis` → `| null`) — provisional per TASK-02's
   own note; flagged here so the Project Lead sees the contract move.
4. **Migration runner is minimal** (forward-only, no down migrations, no checksum verification of
   applied files). Adequate for the project's needs; revisit if a migration ever needs a rollback
   path.
5. Carried from TASK-01: local Node 22.8.0 and the `vite@6` / `jsdom@25` `pnpm-workspace.yaml`
   overrides — unchanged. `zod@4.6.0` added a `minimumReleaseAgeExclude` entry (fresh release).

## ACCEPTANCE CRITERIA

`NFFC_Development_Plan.md` v3.2 TASK-04:

| Criterion | Status | Evidence |
|---|---|---|
| Environment management (dev / staging / production) | Met | `infra/env.ts` — `APP_ENV`, per-env required fields + defaults; `infra/env.test.ts` |
| RPC abstraction to Robinhood Chain (4663) | Met | `infra/rpc/chain-reader.ts` implements `domain/ports` `ChainReader` for chain 4663 |
| **RPC abstraction supports multiple providers, not coupled to one RPC** | Met | viem `fallback([http(a), http(b), …])`; failover proven by `infra/rpc/chain-reader.test.ts` |
| PostgreSQL + Redis connections | Met | `infra/db/pool.ts` (pooled, lazy, `withTransaction`), `infra/redis/client.ts` (lazy `ioredis`); `db/` migrations + runner |
| Structured logging + error boundaries | Met | `infra/logging/logger.ts` (pino + redaction + `Logger` interface); `src/app/{error,global-error,not-found}.tsx` |
| Test infrastructure (unit, integration, contract) | Met | Vitest node env for infra; `tests/support/fakes.ts`; `runChainReaderContract`; `docs/conventions.md` §4 |
| Sensitive variables out of the repo; `.env.example` documented | Met | `.gitignore` (TASK-01) + expanded `.env.example`; logger redaction; fail-fast loader |

## PULL REQUEST

Branch `task/TASK-04-infrastructure`, based on **`task/TASK-03-design-system`** (stacked;
TASK-01 → 02 → 03 → 04 not yet merged).

**PR: to be filled after `gh pr create` (base = `task/TASK-03-design-system`).**
**CI: to be filled after the GitHub Actions run.**

Rebase onto `main` and retarget the base as the parent PRs merge. **Do not merge** — Project Lead
reviews and authorizes. Merge order: PR #1 → #2 → #3 → #4 → this PR.

## NEXT TASK

**TASK-05 — Asset Identity & Representation Registry** (`NFFC_Development_Plan.md` v3.2): the
on-chain `AssetIdentityRegistry.sol` + `RepresentationRegistry.sol` implementing
`Asset Identity → Provider → Network → Representation`, with `AccessControl`, allowlist-only
representation admission, and no single-provider assumption. First Solidity TASK — needs a contracts
toolchain (Foundry/Hardhat) decision, recorded in that report. Depends on TASK-02 + TASK-04.
Blocked until the Project Lead merges this PR and authorizes TASK-05.
