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
| `indexer/` | Decode + plan (`domain/indexer/`, pure) → apply idempotently to Postgres mirror tables (`activity`, `nffc`, `nffc_component`, `listing`, `offer`); `run.ts`'s orchestrator is fully unit-tested (incl. crash-recovery and reprocessing-doesn't-duplicate), `index.ts`/`onchain.ts` are thin and log "not configured" until TASK-31 deploys `NFFC.sol`/`Marketplace.sol` (`docs/indexer.md`) | TASK-24 |
| `nav-materializer/` | Fetch prices (TASK-22) → persist → compute Reference NAV → persist (TASK-23); `materialize.ts`'s orchestrator is fully unit-tested, `index.ts` is thin and logs "not configured" until TASK-24 supplies a token source | TASK-23 |
| Art rendering | Generative art from composition | TASK-12 |

## Convention

The **logic** lives in `provider-sync/` — a pure reconciler (`reconcile.ts`) and an injected
orchestrator (`sync.ts` → `runProviderSync(deps)`), fully unit-tested with fakes. A provider's
`index.ts` is one call to `runProviderSyncWorker(spec)` (provider id + env-var names) — not
unit-tested. A worker whose dependencies aren't configured yet (contracts undeployed) logs and exits
cleanly. A worker implements `Worker` (`name` + `run(signal)`) and stops promptly once
`signal.aborted`.
