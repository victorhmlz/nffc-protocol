# TASK 02 REPORT

## STATUS

COMPLETED

Local gate `pnpm verify` (lint · typecheck · test · build) is green, and the GitHub Actions CI run
on PR #3 passed — all steps in ~31s. See the PULL REQUEST section.

## OBJECTIVE

Stand up the target module structure (`domain`, `src` web + API, `adapters`, `config`, `workers`,
tests) on Next.js App Router as the single dapp framework; define the minimal Provider/Network
Adapter interfaces; set naming and test-organization conventions; and fix the Server vs. Client
Component convention (`NFFC_Development_Plan.md` v3.2 TASK-02).

## CHANGES

- **Packaging decision: single package + path aliases + ESLint-enforced boundaries** (the Dev Plan
  leaves "monorepo o multi-paquete" to this report). Rationale in KNOWN ISSUES / decision note
  below. A pnpm-workspace split remains a clean future move because the module boundaries and
  aliases are established now.
- **Path aliases** added to `tsconfig.json` and `vitest.config.ts`: `@domain`, `@adapters`,
  `@config`, `@workers` (plus the existing `@/*` → `src/*`).
- **`domain/`** — framework- and provider-agnostic core, **types and interfaces only**:
  - `shared/branded.ts` — nominal `Brand<T,B>`, `UnixMillis`, `UnixSeconds`, `Address`, `Hex32`.
  - `registry/types.ts` — `AssetIdentity`, `Provider`, `Network`, `Representation`,
    `OracleMetadata`, id brands, `EntityStatus`, `AssetClass` (descriptive only).
  - `nffc/composition.ts` — `Component`, `Composition`, `CompositionSegment`, `TokenId`,
    `CollectionId`, `WeightBps`, and the invariant constants `MIN_COMPONENTS=1`,
    `MAX_COMPONENTS=20`, `BPS_TOTAL=10_000`.
  - `pricing/types.ts` — `NormalizedPrice` (`raw`, `normalized`, `priceDecimals`, `observedAt`,
    `source`, `multiplier`, `stale`), `PriceSource`.
  - `valuation/types.ts` — `ReferenceNav`, `NavPoint`, `PerformanceWindow`, `PerformancePoint`.
  - `rarity/types.ts` — `StaticRarity`, `StaticRarityInputs`, `StaticRarityScore` (V1 static axis
    only; the dynamic badge axis is V1.5 and deliberately absent).
  - `ports/` — `Clock`, `ChainReader`, `BlockchainEventSource`, `PriceOracle`, `ProviderAdapter`
    interfaces + a barrel. No implementations.
  - `index.ts` — public barrel.
- **`adapters/`** — `provider-adapter-registry.ts` (`ProviderId → ProviderAdapter` lookup,
  populated at the composition root) + barrel. `robinhood/` and `crypto/` are created by TASK-06 /
  TASK-07.
- **`config/`** — `chain.ts` (`ROBINHOOD_CHAIN` fixed facts: chainId 4663, `ETH` gas, L2 on
  Arbitrum), `types.ts` (`AppConfig` shape — RPC/db/redis/log level), barrel. The loader is TASK-04.
- **`workers/`** — `runtime.ts` (`Worker` interface + `runWorker()` harness wiring
  SIGINT/SIGTERM → `AbortSignal`) + `_template/index.ts` (copyable example). Runner-agnostic; the
  TS runner and `pnpm` script are deferred to TASK-06 (see KNOWN ISSUES).
- **`src/`** — `app/api/health/route.ts`: a canonical Route Handler (`GET` → JSON liveness) plus its
  test. Demonstrates the API layer with no wallet/db.
- **ESLint boundaries** (`eslint.config.mjs`): `no-restricted-imports` (core rule, no new plugin)
  scoped to `domain/**` and `adapters/**` — enforces the one-way `domain → adapters → src/workers`
  dependency direction. Verified to reject a forbidden import (see SECURITY).
- **`docs/conventions.md`** — new engineering handbook: module boundaries & dependency direction,
  path aliases, Server vs. Client Components, Route Handlers vs. workers, test organization &
  naming, TypeScript rules.
- Skeleton `README.md` files in `domain/`, `adapters/`, `config/`, `workers/` rewritten to describe
  actual contents and which TASK fleshes each out. Root `README.md` updated (status, layout,
  aliases, conventions link).
- `next.config.ts` reformatted by Prettier (formatting only; no config change).

## FILES CREATED

```
adapters/index.ts
adapters/provider-adapter-registry.ts
config/chain.ts
config/index.ts
config/types.ts
docs/conventions.md
domain/index.ts
domain/nffc/composition.ts
domain/nffc/composition.test.ts
domain/ports/chain-reader.ts
domain/ports/clock.ts
domain/ports/event-source.ts
domain/ports/index.ts
domain/ports/price-oracle.ts
domain/ports/provider-adapter.ts
domain/pricing/types.ts
domain/rarity/types.ts
domain/registry/types.ts
domain/shared/branded.ts
domain/valuation/types.ts
src/app/api/health/route.ts
src/app/api/health/route.test.ts
tests/architecture-foundation.test.ts
workers/_template/index.ts
workers/runtime.ts
docs/reports/TASK-02-REPORT.md   (this file)
```

## FILES MODIFIED

```
README.md                 status, layout, aliases, conventions link
adapters/README.md        real contents
config/README.md          real contents
domain/README.md          real contents
workers/README.md         real contents
eslint.config.mjs         module-boundary rules (no-restricted-imports)
next.config.ts            Prettier reformat only
package.json              description; (tsx added then removed — see KNOWN ISSUES)
pnpm-lock.yaml            lockfile (net: unchanged from TASK-01 dep set)
tsconfig.json             @domain/@adapters/@config/@workers path aliases
vitest.config.ts          matching resolve aliases; include domain/adapters/config/workers/tests
```

Branch is based on `task/TASK-01-project-initialization` (see PULL REQUEST).

## TESTS

`pnpm test` → Vitest 3.2.7, **4 files, 7 tests, all pass**:

```
✓ domain/nffc/composition.test.ts (1)          invariant constants
✓ src/app/api/health/route.test.ts (1)         GET /api/health → 200 JSON
✓ tests/architecture-foundation.test.ts (3)    cross-module wiring via aliases
✓ src/app/page.test.tsx (2)                     (from TASK-01)
```

No behaviour is implemented, so tests assert structure only: the invariant constants, the fixed
chain facts, that the adapter registry composes empty, and that Route Handlers work. Domain-local
tests import `@domain/*` only; the cross-module test lives in `tests/` per `docs/conventions.md` §4
(the domain boundary rule correctly rejected an earlier version that imported `@config`/`@adapters`
from under `domain/`).

## BUILD

`pnpm build` → Next.js 16.3.4 (Turbopack): compiled successfully, TypeScript checked, 3 routes:

```
┌ ○ /                  (Static)
├ ○ /_not-found        (Static)
└ ƒ /api/health        (Dynamic)   ← new Route Handler
```

## LINT / TYPECHECK

- `pnpm lint` → ESLint 9.39.5, clean. New rules: `no-restricted-imports` on `domain/**` and
  `adapters/**`.
- `pnpm typecheck` → `next typegen` + `tsc --noEmit` (TypeScript 5.9.3, `strict` +
  `noUncheckedIndexedAccess`). Clean across `domain/`, `adapters/`, `config/`, `workers/`, `src/`,
  `tests/`.
- `pnpm format:check` (source, `docs/` excluded) → clean after formatting 4 files.

## SECURITY

STEP 5 AUDIT for an architecture-foundation TASK — the deliverable is *enforced boundaries*, and
the enforcement was verified, not just assumed:

- Temporarily added `import "next/server"`, `import "react"`, and
  `import "@adapters/provider-adapter-registry"` to a `domain/` file and ran `pnpm lint` — all three
  were rejected with `no-restricted-imports` errors (`✖ 3 problems`). Reverted; lint clean again.
  CI runs `pnpm lint`, so a boundary violation fails the build.
- `domain/` imports nothing from `next`, `react`, `adapters/`, `src/`, `workers/`, or `config/`
  (TASK-02 acceptance).
- Adapter interfaces (`ProviderAdapter` in `domain/ports`) compile with **no** concrete
  implementation (TASK-02 acceptance).
- Workers are a structurally separate module that never imports `next`; the harness is a plain-Node
  process contract (TASK-02 acceptance).
- Every domain data type — ids, weights, prices, timestamps, NAV — is explicitly typed via branded
  types or named interfaces. **No `any` anywhere** (`@typescript-eslint/no-explicit-any: error`).
- No secrets, addresses, or `.env` content committed. `config/` holds only shapes and the public
  chain constant.

## PERFORMANCE

Not applicable — types, interfaces, and a liveness route. `next build` ~5s; `pnpm test` ~2.9s.

## KNOWN ISSUES

1. **Packaging decision — single package, not a workspace monorepo (decision, open to Project Lead
   override).** The Dev Plan defers this to the report. Chosen: one `package.json`, module
   separation by directory + path aliases, boundaries enforced by ESLint. Rationale: TASK-02
   acceptance is about enforced boundaries and compiling interfaces, not deployment isolation; a
   workspace split adds real friction (`transpilePackages`, multiple installs, version sync) with
   little V1 benefit, and Rule 6 says implement only what is necessary. **Migration path if the
   Project Lead wants workspaces:** move `domain/`, `adapters/`, `config/` under `packages/*` and
   `src/` under `apps/web/`, add a `pnpm-workspace.yaml` `packages:` list and per-package
   `package.json`; the aliases and the one-way dependency direction already match that layout, so it
   is mechanical.
2. **Worker TS runner deferred to TASK-06.** `tsx` was added, but it hits the same `require(esm)`
   wall as TASK-01's Vite/jsdom issue on the local Node 22.8.0 (`ERR_REQUIRE_ESM` from `tsx` on
   `workers/_template/index.ts`). Rather than pin another package backward, `tsx` and the
   `pnpm worker` script were removed; `workers/runtime.ts` + `_template` are runner-agnostic and
   typecheck. TASK-06, which builds the first real worker, chooses the runner (`tsx` on a bumped
   Node, Node native `--experimental-strip-types`, or a `tsc` build step). This is the **same**
   root cause as TASK-01 KNOWN ISSUE #1 — bumping the local Node baseline to ≥ 22.12 clears it.
3. **`vite@6.4.3` / `jsdom@25.0.1` overrides** from TASK-01 remain in `pnpm-workspace.yaml` for the
   same reason; unchanged by this TASK.
4. **`domain/index.ts` and `ports/index.ts` are barrels using `export *` / `export type`.** Fine
   under `isolatedModules`; if `verbatimModuleSyntax` is enabled later, the port barrel already uses
   `export type`.
5. `workers/_template/index.ts` uses top-level `await`. It typechecks (`module: esnext`) and is not
   bundled by Next (not imported from `src/`). It exists to show the shape, not to be run in
   TASK-02.

## ACCEPTANCE CRITERIA

`NFFC_Development_Plan.md` v3.2 TASK-02:

| Criterion | Status | Evidence |
|---|---|---|
| Module base for domain, web, API, blockchain, adapters, config, database, tests on Next.js App Router | Met | `domain/`, `src/app` + `src/app/api`, `adapters/`, `config/`, `workers/`, `tests/`; §CHANGES |
| Project structure — monorepo vs multi-package decided in the report | Met | KNOWN ISSUES #1 — single package + aliases, with migration path |
| Minimal Provider/Network Adapter interfaces | Met | `domain/ports/provider-adapter.ts` (`ProviderAdapter`), `chain-reader.ts`, `event-source.ts`, `price-oracle.ts` |
| Naming & test-organization conventions | Met | `docs/conventions.md` §4–5 |
| Explicit Server vs. Client Component convention (wallet/signing → Client; public → Server-first) | Met | `docs/conventions.md` §2 |
| No domain module imports Robinhood or any crypto-adapter code directly | Met | `no-restricted-imports` on `domain/**` bans `@adapters`/`**/adapters/**`; verified (SECURITY) |
| No domain module imports Next.js APIs directly | Met | same rule bans `next`, `next/*`, `react`; verified |
| Adapter interfaces compile with no concrete implementation | Met | `pnpm typecheck` clean; `domain/ports/*` are interfaces only |
| Sync/index workers run outside the Next request cycle, not as long-running Route Handlers | Met | `workers/` module + `runtime.ts` plain-Node contract; `docs/conventions.md` §3 |
| Every domain data type explicitly typed; no unjustified `any` | Met | branded types + interfaces throughout; `no-explicit-any: error`, lint clean |

## PULL REQUEST

Branch `task/TASK-02-architecture-foundation`, based on **`task/TASK-01-project-initialization`**
(TASK-02 depends on TASK-01, which is not yet merged — this is a stacked PR).

**PR: https://github.com/victorhmlz/nffc-protocol/pull/3** — base `task/TASK-01-project-initialization`.
**CI: https://github.com/victorhmlz/nffc-protocol/actions/runs/34359379955 — success** (install ·
lint · typecheck · test · build, ~31s).

When PR #2 (TASK-01) merges to `main`, this branch is rebased onto `main` and the PR base retargeted
to `main`. **Do not merge** — Project Lead reviews and authorizes. Merge order: PR #1 → PR #2 →
this PR.

## NEXT TASK

**TASK-03 — Design System** (`NFFC_Development_Plan.md` v3.2): visual tokens (color, type, spacing)
in light and dark; base components (cards, tables, badges, charts, buttons, forms, modals, wallet
states); responsive rules. Aesthetic: premium financial terminal + collectible marketplace, not
meme-coin/casino. Depends on TASK-00 (met). Blocked until the Project Lead merges this PR and
authorizes TASK-03.
