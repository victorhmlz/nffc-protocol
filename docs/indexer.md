# Indexer (TASK-24)

Watches `NFFC.sol` and `Marketplace.sol` for Transfer, mint (+ composition), listing, sale, and
offer events and mirrors them, idempotently, into Postgres — `activity` (the append-only feed
TASK-21's `/nffc/[tokenId]` page renders) plus the `nffc`/`nffc_component`/`listing`/`offer`
read-model tables `docs/spec/09-data-model.md` defines (`NFFC_Development_Plan.md` v3.2 TASK-24).
Depends on TASK-19 (Marketplace Contract), merged.

## Acceptance criteria

- **Recuperación automática tras caída sin pérdida de eventos.**
- **Reprocesar el mismo bloque dos veces no duplica datos.**

Both are proven directly by dedicated tests in `workers/indexer/run.test.ts`, not just asserted:
a "crash recovery" test aborts a pass mid-batch via `AbortSignal` and shows the cursor never
advances, then a full retry applies every event with none lost or duplicated; an "idempotency"
test runs the *same* block range through `runIndexerPass` twice and shows the second pass's
events are all recognized as duplicates and applied zero times.

## Decode layer (pure, `domain/indexer/`)

- **`decodeEvent(log: LogEvent): IndexedEvent | null`** (`decode.ts`) — turns a raw
  `BlockchainEventSource` log into one of nine typed `IndexedEvent` variants (`events.ts`):
  `NFFCMinted`, `NFFCCompositionRecorded`, `Transfer`, `ListingCreated`, `ListingCancelled`,
  `Sale`, `OfferCreated`, `OfferCancelled`, `OfferAccepted`. Returns `null` for anything else
  (forward-compatible with events this indexer doesn't care about) and throws
  `MalformedEventError` for a recognized event name with a missing/wrong-typed field — a decode
  bug should be loud, not silently drop data.
  - `NFFCCompositionRecorded` and `OfferCancelled` aren't in TASK-24's literal event list but are
    emitted by `NFFC.sol`/`Marketplace.sol` regardless — decoding them is necessary to populate
    `nffc_component` and to close cancelled offers at all.
- **`planWrite(event, ctx): PlannedWrite`** (`plan.ts`) — the pure decision of what a decoded
  event means for storage: an `ActivityEntry | null` for the human-readable feed, and a
  `MirrorWrite | null` (one of `NFFC_MINT`, `NFFC_COMPONENTS`, `OWNER_CHANGED`, `LISTING_OPENED`,
  `LISTING_CLOSED`, `OFFER_OPENED`, `OFFER_CLOSED`) for the read-model tables. Notable decisions:
  - `activityId = ${txHash}-${logIndex}` — matches `docs/spec/09-data-model.md`'s idempotency key
    for `activity` exactly, and is the single choke-point `IndexerStore.recordActivity` uses to
    detect a re-processed event.
  - `NFFCCompositionRecorded` produces no activity row (the mint's own `NFFCMinted` already logged
    one) — only the `NFFC_COMPONENTS` mirror write.
  - A zero-address `Transfer` (the mint's own internal transfer) produces neither activity nor
    mirror — it's redundant with `NFFCMinted`, which already carries the creator.
  - `Sale` only closes the listing (`LISTING_CLOSED, reason: "SOLD"`) — it never touches ownership;
    that's `Transfer`'s job, emitted in the same transaction.
  - `OfferCancelled(offerId)` carries no actor of its own — `actorAddress` falls back to
    `ctx.transactionSender` (`LogEvent.transactionSender`, added in this TASK). It also carries no
    `tokenId`, so that field is `null` — see `docs/OPEN_ISSUES.md` Issue #8.

Both are pure and fully unit-tested (23 tests between `decode.test.ts` and `plan.test.ts`) — no
chain, no database, no clock beyond the `EventContext` passed in.

## Ports

- **`BlockchainEventSource`** (`domain/ports/event-source.ts`, TASK-02, extended here) —
  `getSafeHead()` / `getEvents(range, addresses)`. `LogEvent` gained `transactionSender` in this
  TASK (additive — needed by `OfferCancelled`'s actor fallback above).
- **`IndexerStore`** (`domain/ports/indexer-store.ts`, new) — `getCursor`/`advanceCursor` (per
  named stream, so more than one indexer could run independently in the future),
  `recordActivity` (returns `true` only when newly inserted — the idempotency gate), and
  `applyMirrorWrite`.

## Orchestration — `workers/indexer/run.ts`

`runIndexerPass(deps): Promise<IndexerRunSummary>` — the same fully-tested,
all-I/O-injected-via-`deps` shape every worker in this project uses:

1. Read the stored cursor; if none, start at `genesisBlock`. If one exists, resume from
   `cursor - reorgSafetyMarginBlocks` (never before genesis) — cheap re-processing of a small
   trailing window, made safe because every write downstream is idempotent.
2. Cap the range at `min(safeHead, fromBlock + maxBlockRange)` — never runs unbounded, never
   reads past what `getSafeHead()` calls final.
3. For each event, decode → plan → apply: `recordActivity` first (if the plan has one) gates
   whether the corresponding `mirror` write happens at all; a plan with only a mirror write (e.g.
   `NFFC_COMPOSITION_RECORDED`) applies unconditionally, since it has no activity row to dedupe on
   and `applyMirrorWrite`'s own SQL (delete+reinsert, or an `ON CONFLICT`) is idempotent by
   construction (`infra/indexer/postgres-indexer-store.ts`).
4. The cursor advances **only after a full, uninterrupted pass** — an aborted pass (`AbortSignal`,
   e.g. the process is shutting down) leaves the cursor untouched, so the next invocation safely
   redoes the same range from scratch. This is the whole crash-recovery story: a little
   potentially-redundant work on restart, in exchange for a trivially-correct recovery path that's
   directly provable by a test, rather than a partial-progress cursor that would need its own
   correctness argument.

`workers/indexer/index.ts` is the thin, untested glue that builds the real dependencies
(`createOnchainEventSource`, `createPostgresIndexerStore`, a real block-timestamp lookup) and logs
why it's skipping rather than running when they aren't ready — same shape as
`workers/provider-sync/` and `workers/nav-materializer/`.

## Persistence layer

`db/migrations/0003_indexer_mirror.sql` creates `nffc`, `nffc_component`, `listing`, `offer`, and
`activity` per `docs/spec/09-data-model.md`. `collection` is deliberately **not** created here —
see `docs/OPEN_ISSUES.md` Issue #9.

`infra/indexer/postgres-indexer-store.ts` implements `IndexerStore` over `infra/db`'s
`query`/`withTransaction` — thin glue, **not** unit-tested directly, the same boundary
`infra/valuation/postgres-*.ts` and `infra/db/pool.ts` already accept
(`docs/conventions.md` §4: no test touches a real database). `recordActivity` uses
`INSERT ... ON CONFLICT (tx_hash, log_index) DO NOTHING RETURNING id` — the idempotency key is
enforced by the database itself, not just by application logic.

## Chain glue — `workers/indexer/onchain.ts`

`createOnchainEventSource(rpcUrls)` — real viem `getLogs` over the nine event ABIs, verified
against `contracts/interfaces/INFFC.sol` / `IMarketplace.sol`'s actual signatures.
`createBlockTimestampLookup(rpcUrls)` — a `(blockNumber) => UnixSeconds` fetcher, cached per block
for the lifetime of one worker invocation (most events in a pass share a handful of blocks).
Neither is unit-tested directly — the same untested-glue boundary `workers/provider-sync/onchain.ts`
and `infra/rpc/chain-reader.ts` already accept; everything that matters for the acceptance criteria
lives in `domain/indexer/` and `run.ts`, both fully tested against a fake of this port
(`tests/support/fakes.ts`'s `createFakeEventSource`).

**Known, accepted cost:** `getEvents` makes one extra `getTransaction` RPC call per log to get its
sender (needed only by `OfferCancelled`'s actor fallback). Not batched. Not a correctness issue —
flagged as a performance tradeoff, not escalated to `docs/OPEN_ISSUES.md` since it's a local
optimization opportunity, not a cross-task contradiction.

## Not operational yet

Same axis every worker in this project shares: `NFFC.sol` and `Marketplace.sol` have no deployed
address until TASK-31. `workers/indexer/config.ts`'s `loadIndexerConfig()` reports this and
`index.ts` exits cleanly — verified live via `pnpm worker workers/indexer/index.ts`:
`"not configured — skipping (deploy NFFC.sol + Marketplace.sol, TASK-31)"`, never crashes.

`index.ts` loads `createPostgresIndexerStore` with a dynamic `import()`, not a static one, gated
behind the configuration check — see `docs/OPEN_ISSUES.md` Issue #7 for why a static import would
have crashed the worker outright, even in this everyday "not configured" path.

## What's still deferred

- `collection` / `CollectionCreated` — Issue #9.
- `OfferCancelled` activity rows have `tokenId: null` — Issue #8.
- The `server-only` import chain that will need resolving before this worker (or
  `nav-materializer`) can actually run configured, outside Next.js — Issue #7.
- No live wiring into `/nffc/[tokenId]`'s activity feed yet — that page still reads
  `fixture-detail.ts`. Wiring it needs both a deployed contract (TASK-31) and a running indexer
  process; the decode/plan/store logic itself doesn't block on either to be correct and tested.
