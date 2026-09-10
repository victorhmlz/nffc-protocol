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
| `provider-sync/` | **Shared** provider-sync engine: token source, pure reconciler, injected orchestrator, viem glue, `runProviderSyncWorker(spec)` | TASK-06 / TASK-07 |
| `robinhood-sync/index.ts` | Thin wrapper — `ROBINHOOD` provider, `RobinhoodAdapter` | TASK-06 |
| `crypto-sync/index.ts` | Thin wrapper — `CRYPTO_NATIVE` provider, `CryptoAdapter` (a peer, same engine) | TASK-07 |
| Blockchain indexer | Idempotent event indexing into PostgreSQL | TASK-24 |
| NAV materialization | Normalize oracle prices, compute Reference NAV history | TASK-22 / TASK-23 |
| Art rendering | Generative art from composition | TASK-12 |

## Convention

The **logic** lives in `provider-sync/` — a pure reconciler (`reconcile.ts`) and an injected
orchestrator (`sync.ts` → `runProviderSync(deps)`), fully unit-tested with fakes. A provider's
`index.ts` is one call to `runProviderSyncWorker(spec)` (provider id + env-var names) — not
unit-tested. A worker whose dependencies aren't configured yet (contracts undeployed) logs and exits
cleanly. A worker implements `Worker` (`name` + `run(signal)`) and stops promptly once
`signal.aborted`.
