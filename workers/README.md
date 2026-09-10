# `workers/`

Long-running / scheduled processes that run **outside** the Next.js request cycle
(`docs/spec/03-architecture.md` §4) — plain Node processes, never Route Handlers.

**Run:** `pnpm worker workers/<name>/index.ts` (= `tsx`; needs Node ≥ 22.13).

**Boundaries** (enforced by ESLint): may import `domain/`, `adapters/`, `config/`, `infra/`; may
**not** import `src/`, `next`, or `react`.

## Layout

| Path | Contents | TASK |
|---|---|---|
| `runtime.ts` | `Worker` interface + `runWorker()` harness (SIGINT/SIGTERM → `AbortSignal`) | TASK-02 |
| `_template/index.ts` | Copyable example worker | TASK-02 |
| `robinhood-sync/` | Reconcile Robinhood's official Stock Token list into the registry via `RobinhoodAdapter` | TASK-06 |
| Crypto sync | Same, for native crypto | TASK-07 |
| Blockchain indexer | Idempotent event indexing into PostgreSQL | TASK-24 |
| NAV materialization | Normalize oracle prices, compute Reference NAV history | TASK-22 / TASK-23 |
| Art rendering | Generative art from composition | TASK-12 |

## Convention

The **logic** lives in a pure/injected orchestrator (`robinhood-sync/sync.ts` →
`runRobinhoodSync(deps)`), fully unit-tested with fakes. `index.ts` is thin glue that builds the
real deps (chain client, tx signer, config source, DB cursor) and calls it — not unit-tested. A
worker whose dependencies aren't configured yet (e.g. contracts undeployed) logs and exits cleanly.
A worker implements `Worker` (`name` + `run(signal)`) and stops promptly once `signal.aborted`.
