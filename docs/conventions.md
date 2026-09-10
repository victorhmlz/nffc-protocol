# Engineering Conventions

Companion to `docs/spec/` (the product & architecture specification). This file is the code-level
handbook: module boundaries, the Server/Client split, Route Handlers vs. workers, and test layout.
Established in TASK-02.

---

## 1. Module boundaries & dependency direction

```
src/  (Next.js: Server + Client Components, Route Handlers)
  │        │
  │        ▼
  │      adapters/  ──►  domain/
  ▼        ▲               ▲
workers/ ──┘               │
config/  ──────────────────┘
```

One-way only:

| Module | May import | May **not** import |
|---|---|---|
| `domain/` | `domain/` only | `next`, `react`, `adapters/`, `src/`, `workers/`, `config/` |
| `adapters/` | `domain/` | `src/`, `workers/`, `next` |
| `config/` | `domain/` | `src/`, `adapters/`, `workers/`, `next` |
| `workers/` | `domain/`, `adapters/`, `config/` | `src/`, `next` |
| `src/` | `domain/`, `adapters/`, `config/` | `workers/` internals |

- `domain/` is **framework-agnostic and provider-agnostic**. It knows only its own types and the
  interfaces in `domain/ports/`. It never names Robinhood or crypto.
- Adapters are wired to the domain at a **composition root** (a Route Handler, a Server Component
  data function, or a worker entry) via `adapters/provider-adapter-registry.ts` — never from inside
  `domain/`.
- These rules are enforced by ESLint (`no-restricted-imports`, `eslint.config.mjs`). A violation
  fails `pnpm lint` and CI.

### Path aliases

| Alias | Path |
|---|---|
| `@/*` | `src/*` |
| `@domain`, `@domain/*` | `domain/*` |
| `@adapters`, `@adapters/*` | `adapters/*` |
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
cursor. See `workers/_template/index.ts`.

The TS runner for workers (`tsx`, Node native type-stripping, or a `tsc` build) and its `pnpm`
script are decided in TASK-06, when the first real worker exists and the local Node baseline is
settled (see `docs/reports/TASK-02-REPORT.md`). The harness and template are runner-agnostic.

## 4. Test organization & naming

| Kind | Location | Pattern |
|---|---|---|
| Unit / component | Co-located with the code | `<name>.test.ts` / `<name>.test.tsx` |
| Cross-module / integration | `tests/` at the repo root | `<area>.test.ts` |
| End-to-end (later, TASK-37) | `e2e/` | `<flow>.spec.ts` — **excluded** from the Vitest run |

- Runner: **Vitest** (`pnpm test`). `jsdom` environment, globals on, setup in `vitest.setup.ts`.
- One behaviour per `it`; `describe` names the unit under test.
- Domain tests must not reach for a network, a database, or a wallet — inject a fake port
  (`domain/ports/*`) instead.
- A test file is picked up only under `src/`, `domain/`, `adapters/`, `config/`, `workers/`, or
  `tests/` (see `vitest.config.ts` `include`).

## 5. TypeScript

- `strict` + `noUncheckedIndexedAccess`. No `any` without a comment on the same line saying why
  (`@typescript-eslint/no-explicit-any` is an error).
- Domain data (ids, weights, prices, timestamps) uses the **branded types** in
  `domain/shared/branded.ts` and the per-concept modules — not bare `string` / `number`.
- Prefer `readonly` fields and `readonly T[]` on domain types; they describe records, not mutable
  state.
