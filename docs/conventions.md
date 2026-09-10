# Engineering Conventions

Companion to `docs/spec/` (the product & architecture specification). This file is the code-level
handbook: module boundaries, the Server/Client split, Route Handlers vs. workers, and test layout.
Established in TASK-02.

---

## 1. Module boundaries & dependency direction

```
src/  (Next.js: Server + Client Components, Route Handlers)
  │      │        │
  │      │        ▼
  │      │      adapters/ ──►  domain/
  ▼      ▼        ▲               ▲
workers/ infra/ ──┘               │
         config/ ─────────────────┘
```

One-way only:

| Module | May import | May **not** import |
|---|---|---|
| `domain/` | `domain/` only | `next`, `react`, `adapters/`, `infra/`, `src/`, `workers/`, `config/` |
| `config/` | `domain/` | `src/`, `adapters/`, `infra/`, `workers/`, `next` |
| `adapters/` | `domain/`, `config/`, `infra/` | `src/`, `workers/`, `next` |
| `infra/` | `domain/`, `config/` | `src/`, `adapters/`, `workers/`, `next` |
| `workers/` | `domain/`, `config/`, `adapters/`, `infra/` | `src/`, `next` |
| `src/` | `domain/`, `config/`, `adapters/`, `infra/` | `workers/` internals |

- `domain/` is **framework-agnostic and provider-agnostic**. It knows only its own types and the
  interfaces in `domain/ports/`. It never names Robinhood or crypto, and never touches a runtime
  concern (DB, RPC, logging) directly — those are `infra/`, reached through a port.
- `infra/` holds the runtime plumbing: the env loader, the structured logger, the multi-provider
  RPC `ChainReader`, the PostgreSQL pool, the Redis client, the health check. It is `server-only`
  and imports Node libraries (`pg`, `ioredis`, `pino`, `viem`).
- Adapters and infra are wired to the domain at a **composition root** (a Route Handler, a Server
  Component data function, or a worker entry) — never from inside `domain/`.
- These rules are enforced by ESLint (`no-restricted-imports`, `eslint.config.mjs`). A violation
  fails `pnpm lint` and CI.

### Path aliases

| Alias | Path |
|---|---|
| `@/*` | `src/*` |
| `@domain`, `@domain/*` | `domain/*` |
| `@adapters`, `@adapters/*` | `adapters/*` |
| `@infra`, `@infra/*` | `infra/*` |
| `@config`, `@config/*` | `config/*` |
| `@workers/*` | `workers/*` |

Prefer aliases over deep relative paths (`../../..`). Within a single module folder, relative
imports (`./types`) are fine.

## 2. Server vs. Client Components (`src/`)

Default is **Server**. A file is a Client Component only when it needs the browser or a wallet.

| Concern | Kind |
|---|---|
| Marketplace, NFFC detail (`/nffc/[tokenId]`), profiles, activity, search, collection pages | **Server** (Server Components + ISR). Must render and be shareable with **no** wallet connected. |
| Wallet connect / network switch / signing, the create-wizard submission, buy / list / cancel / offer actions, admin writes | **Client** (`"use client"`). Anything touching a wallet or a signature. |
| Reads for public surfaces | Server Component data functions or Route Handlers → DB + cache + bounded RPC. **No** per-item on-chain loops in a page. |

Keep `"use client"` at the leaves. A Server Component may render a Client Component; not the
reverse.

## 3. Route Handlers vs. workers

| | Route Handler (`src/app/**/route.ts`) | Worker (`workers/**`) |
|---|---|---|
| Lifetime | One request/response, short | Long-running / scheduled process |
| Runtime | Next.js server | Plain Node process |
| Use for | Reads for the UI, health checks, webhooks | Indexing, provider sync, NAV materialization, art rendering |
| Never | Long polling, block-range scans, queue consumers | Importing `next` |

Worker shape: implement `Worker` from `@workers/runtime` (`name` + `run(signal)`), start it with
`runWorker(...)`. `run` must return promptly once `signal.aborted` is true, after persisting its
cursor. See `workers/_template/index.ts` and `workers/provider-sync/`.

**Runner:** `pnpm worker workers/<name>/index.ts` (= `tsx`, which resolves the `@…` path aliases).
Needs Node ≥ 22.13. All I/O (chain reads, tx submission, DB, the provider feed) is **injected** into
a tested orchestrator (e.g. `runProviderSync(deps)`); `index.ts` is thin glue that builds the real
deps and is not unit-tested. Two providers that share a pattern share the code — `robinhood-sync`
and `crypto-sync` are each one call to `runProviderSyncWorker(spec)`. A worker that is not yet
configured (contracts undeployed) logs and exits cleanly.

## 4. Test organization & naming

| Kind | Location | Pattern |
|---|---|---|
| Unit / component | Co-located with the code | `<name>.test.ts` / `<name>.test.tsx` |
| Cross-module / integration | `tests/` at the repo root | `<area>.test.ts` |
| Shared test helpers / fakes / contract suites | `tests/support/` | not `*.test.*` — imported, not run |
| End-to-end (later, TASK-37) | `e2e/` | `<flow>.spec.ts` — **excluded** from the Vitest run |

- Runner: **Vitest** (`pnpm test`). Default environment `jsdom`; a **Node**-only file opts in with a
  `// @vitest-environment node` header comment (used by every `infra/` test).
- One behaviour per `it`; `describe` names the unit under test.
- Tests must not reach for a real network, database, Redis, or wallet. Inject a fake:
  - domain / app code → a fake **port** (`tests/support/fakes.ts` — `createFakeChainReader`,
    `FakeClock`, `createFakeLogger`).
  - `infra/` unit tests → stub `fetch` (RPC), inject ping functions (`checkHealth`), or pass an
    explicit env map (`loadConfigFrom`). No test connects to Postgres/Redis; that is integration
    (TASK-31/37), gated behind real services.
- **Contract suites** live in `tests/support/*-contract.ts` as exported `run<X>Contract(make)`
  functions. Run them against the fake here; run the same suite against the real implementation from
  an integration context when a later TASK needs that assurance.
- A test file is picked up only under `src/`, `domain/`, `adapters/`, `config/`, `infra/`,
  `workers/`, or `tests/` (see `vitest.config.ts` `include`).

## 5. TypeScript

- `strict` + `noUncheckedIndexedAccess`. No `any` without a comment on the same line saying why
  (`@typescript-eslint/no-explicit-any` is an error).
- Domain data (ids, weights, prices, timestamps) uses the **branded types** in
  `domain/shared/branded.ts` and the per-concept modules — not bare `string` / `number`.
- Prefer `readonly` fields and `readonly T[]` on domain types; they describe records, not mutable
  state.

## 6. Contracts (`contracts/`)

A separate toolchain — **Hardhat 3** (`hardhat.config.ts` at the repo root), solc **0.8.34** pinned.
Not covered by `pnpm verify`; runs as its own CI job.

```bash
pnpm contracts:build   # hardhat compile
pnpm contracts:test    # hardhat test — Solidity tests
```

- **Node ≥ 22.13** is required (Hardhat 3). `.nvmrc` resolves to a supported 22.x in CI.
- Tests are **Solidity** (`contracts/*.t.sol`, forge-std `Test` base). One assertion focus per
  `test_*`; `testFuzz_*` for property tests. Mocks in `contracts/mocks/`.
- Concrete contracts: `pragma solidity 0.8.34;` (pinned — no floating pragma for deployables);
  interfaces `pragma solidity ^0.8.20;`.
- OpenZeppelin (`@openzeppelin/contracts`) via npm; `forge-std` via a pinned Git dependency.
- `contracts/`, `hardhat.config.ts`, `artifacts/`, `cache/` are excluded from the root `tsconfig`,
  ESLint, and Prettier — the Solidity toolchain owns them.
- Security rules: `docs/spec/08-security-principles.md` (AccessControl, custom errors, complete
  events, checks-effects-interactions, no `tx.origin`, pinned pragma, multisig admin).
