# `workers/`

Long-running / scheduled processes that run **outside** the Next.js request cycle
(`docs/spec/03-architecture.md` §4) — plain Node processes, never Route Handlers. The TS runner and
a `pnpm` script land in TASK-06 with the first real worker; the harness here is runner-agnostic.

**Boundaries** (enforced by ESLint): may import `domain/`, `adapters/`, `config/`; may **not**
import `next`.

## Layout

| Path | Contents | TASK |
|---|---|---|
| `runtime.ts` | `Worker` interface + `runWorker()` harness (SIGINT/SIGTERM → `AbortSignal`) | TASK-02 |
| `_template/index.ts` | Copyable example worker | TASK-02 |
| Representation sync (Robinhood / crypto) | Pull + verify provider representations into the registry | TASK-06 / TASK-07 |
| Blockchain indexer | Idempotent event indexing into PostgreSQL | TASK-24 |
| NAV materialization | Normalize oracle prices, compute Reference NAV history | TASK-22 / TASK-23 |
| Art rendering | Generative art from composition | TASK-12 |

A worker implements `Worker` (`name` + `run(signal)`) and must stop promptly once `signal.aborted`
is true, after persisting its cursor. Never a Route Handler.
