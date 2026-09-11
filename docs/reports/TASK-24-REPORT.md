# TASK 24 REPORT

## STATUS

COMPLETED

`pnpm verify` (lint · typecheck · test · build) green locally — **65 files, 352 tests** (324 → +28).
`pnpm contracts:build` / `pnpm contracts:test` unchanged — **172 Solidity tests** (TASK-24 touches
no `.sol`). Worker entry point smoke-tested live (`pnpm worker workers/indexer/index.ts`) — see
BUILD. Both CI jobs on PR #30 pass — run `34631280833`. See PULL REQUEST.

## OBJECTIVE

Index the blockchain idempotently: Transfer, Mint, ListingCreated, ListingCancelled, Sale,
OfferCreated, OfferAccepted (`NFFC_Development_Plan.md` v3.2 TASK-24).

## SCOPE NOTE

TASK-24 depends on TASK-09 (NFFC ERC-721 core) and TASK-19 (Marketplace Contract), both merged.
Like TASK-22/23, the missing piece downstream (a deployed `NFFC.sol`/`Marketplace.sol`, TASK-31)
is supplied via the project's established forward-dependency pattern: the full decode → plan →
apply pipeline is built and fully tested against a fake `BlockchainEventSource`/`IndexerStore`
(`tests/support/fakes.ts`), with the real viem/Postgres glue written, reviewed, and ready, but
provably unreachable until `workers/indexer/config.ts` sees real contract addresses. Full detail:
`docs/indexer.md`.

Two real gaps surfaced while building this that weren't visible until an indexer actually existed:
`ActivityEntry` (TASK-21) was missing the `tokenId` field its own doc comment already claimed to
mirror from `docs/spec/09-data-model.md`, and no port carried the transaction sender needed for
`OfferCancelled`'s actor. Both fixed as additive extensions (see CHANGES), not new parallel types.

## CHANGES

### `domain/nffc-detail/detail.ts` (modified) — `ActivityEntry.tokenId`

Added `readonly tokenId: string | null` — the field the type's own doc comment already claimed to
mirror from `docs/spec/09-data-model.md`'s `activity.token_id` column, but never actually declared.
Fixed the two downstream consumers this broke: `src/lib/nffc-detail/fixture-detail.ts` and
`src/components/nffc/activity-timeline.test.tsx`.

### `domain/ports/event-source.ts` (modified) — `LogEvent.transactionSender`

Added `readonly transactionSender: Address` (additive) — needed because `OfferCancelled(offerId)`
names no actor of its own; `planWrite` falls back to it.

### `domain/indexer/events.ts` (new) — `IndexedEvent`

A discriminated union of nine decoded event shapes: `NffcMintedEvent`, `NffcCompositionRecordedEvent`
(+ its nested `NffcCompositionComponent`), `TransferEvent`, `ListingCreatedEvent`,
`ListingCancelledEvent`, `SaleEvent`, `OfferCreatedEvent`, `OfferCancelledEvent`,
`OfferAcceptedEvent`. Includes two events beyond TASK-24's literal list
(`NFFCCompositionRecorded`, `OfferCancelled`) — documented in-code why both are necessary regardless
(populating `nffc_component`; closing cancelled offers at all).

### `domain/indexer/decode.ts` (new) — `decodeEvent`

Pure `LogEvent -> IndexedEvent | null`. Unrecognized event names return `null` (forward-compatible);
a recognized name with a missing/wrong-typed field throws `MalformedEventError` rather than
silently producing a half-formed event.

### `domain/indexer/plan.ts` (new) — `planWrite`

Pure `(event, EventContext) -> PlannedWrite` (`ActivityEntry | null` + `MirrorWrite | null`). Key
decisions, all documented in-code and exercised by `plan.test.ts`: activity id is
`${txHash}-${logIndex}` (matches the data-model spec's idempotency key exactly);
`NFFCCompositionRecorded` produces only a mirror write, no duplicate activity row;
a zero-address `Transfer` (the mint's own internal transfer) produces neither, since `NFFCMinted`
already covers it; `Sale` only closes the listing, never touches ownership (that's `Transfer`'s
job in the same transaction); `OfferCancelled` falls back to `ctx.transactionSender` for
`actorAddress` and leaves `tokenId: null` (see KNOWN ISSUES / Open Issue #8).

### `domain/ports/indexer-store.ts` (new) — `IndexerStore`

`getCursor` / `advanceCursor` (per named stream) / `recordActivity` (returns `true` only when
newly inserted — the idempotency gate) / `applyMirrorWrite`.

### `workers/indexer/run.ts` (new) — `runIndexerPass`

The fully-tested orchestrator: resume from `cursor - reorgSafetyMarginBlocks` (or `genesisBlock`
if none), cap the range at the safe head, decode + plan + apply each event, advance the cursor
**only after a full, uninterrupted pass**. This last point is the whole crash-recovery story: an
aborted pass leaves the cursor untouched, so a retry always safely redoes the same range — proven
directly by a dedicated test rather than argued about.

### `workers/indexer/onchain.ts`, `config.ts`, `index.ts` (new)

Real viem event source (`createOnchainEventSource`) and a cached block-timestamp lookup
(`createBlockTimestampLookup`); env-var config loader; thin entry point mirroring
`workers/provider-sync/`'s and `workers/nav-materializer/`'s exact shape — logs why and exits
cleanly when contracts aren't deployed (TASK-31).

`index.ts` loads `createPostgresIndexerStore` via a dynamic `import()`, not a static one, gated
behind the configuration check — a static import crashes the process outright (see KNOWN ISSUES /
Open Issue #7), even in the everyday "not configured" path every other worker exits cleanly from.

### `db/migrations/0003_indexer_mirror.sql` (new)

Creates `nffc`, `nffc_component`, `listing`, `offer`, `activity` per `docs/spec/09-data-model.md`.
`collection` is deliberately excluded — see KNOWN ISSUES / Open Issue #9.

### `infra/indexer/postgres-indexer-store.ts` (new)

Real `IndexerStore` over `infra/db`'s pool. Not unit-tested directly — the same boundary
`infra/valuation/postgres-*.ts` and `infra/db/pool.ts` already accept.

### `tests/support/fakes.ts` (modified)

`createFakeEventSource`, `createInMemoryIndexerStore` — following the existing
`createFakeChainReader`/`createInMemoryPriceStore` pattern.

### Docs

`docs/indexer.md` (new). `infra/README.md`, `workers/README.md` — new rows. `README.md` — status
line, doc link. `docs/OPEN_ISSUES.md` — three new entries, #7/#8/#9 (see KNOWN ISSUES below).

## FILES CREATED

```
domain/indexer/events.ts
domain/indexer/decode.ts
domain/indexer/decode.test.ts
domain/indexer/plan.ts
domain/indexer/plan.test.ts
domain/ports/indexer-store.ts
db/migrations/0003_indexer_mirror.sql
infra/indexer/postgres-indexer-store.ts
infra/indexer/index.ts
workers/indexer/run.ts
workers/indexer/run.test.ts
workers/indexer/onchain.ts
workers/indexer/config.ts
workers/indexer/index.ts
docs/indexer.md
docs/reports/TASK-24-REPORT.md
```

## FILES MODIFIED

```
domain/nffc-detail/detail.ts            ActivityEntry.tokenId
domain/ports/event-source.ts            LogEvent.transactionSender
domain/index.ts                         export indexer/events, indexer/decode, indexer/plan
domain/ports/index.ts                   export IndexerStore
infra/index.ts                          export createPostgresIndexerStore
src/lib/nffc-detail/fixture-detail.ts   add tokenId to activity fixtures
src/components/nffc/activity-timeline.test.tsx  add tokenId to test fixtures
tests/support/fakes.ts                  + createFakeEventSource, createInMemoryIndexerStore
infra/README.md                         indexer/ row
workers/README.md                       indexer/ row (replaces the placeholder row)
README.md                               status line + doc link
docs/OPEN_ISSUES.md                     + Issues #7, #8, #9; "Próximo ID a usar" 7 → 10
```

Branch is based on `main` (TASK-00…23) — see PULL REQUEST.

## TESTS

`pnpm test` → Vitest, **65 files, 352 tests** (28 new):

```
domain/indexer/decode.test.ts (12)   one test per IndexedEvent variant decoded correctly (incl.
                                      the nested components[] array for NFFCCompositionRecorded);
                                      null for an unrecognized event name (Approval);
                                      MalformedEventError for a missing/wrong-typed field
domain/indexer/plan.test.ts (11)     activity id format; NFFC lifecycle (mint, composition-
                                      recorded produces no duplicate activity, zero-address
                                      transfer is a no-op, a real transfer produces both); listing
                                      lifecycle (created, cancelled, sale closes with
                                      reason:"SOLD"); offer lifecycle (created, cancelled with
                                      sender fallback, accepted)
workers/indexer/run.test.ts (5)      happy path over a mixed batch; unrecognized events are
                                      skipped without failing the pass; resumes from the stored
                                      cursor minus the reorg safety margin; idempotency — running
                                      the same block range twice applies zero duplicate events the
                                      second time; crash recovery — an aborted pass leaves the
                                      cursor untouched, and a full retry applies every event with
                                      none lost
```

`pnpm contracts:test` → **172 Solidity tests**, unchanged (TASK-24 adds no `.sol`).

## BUILD

`pnpm build` green — unchanged, same **11 routes** (TASK-24 adds no UI surface).

Smoke-tested live: `pnpm worker workers/indexer/index.ts` →

```
{"level":"warn", ..., "reason":"missing/invalid CONTRACT_NFFC, CONTRACT_MARKETPLACE",
 "msg":"not configured — skipping (deploy NFFC.sol + Marketplace.sol, TASK-31)"}
```

Exits cleanly, no crash. This required a fix along the way: the entry point originally imported
`createPostgresIndexerStore` from `@infra/indexer` at module scope, which crashed immediately —
`infra/indexer/postgres-indexer-store.ts` starts with `import "server-only"`, which throws
unconditionally outside Next's own bundler (see LINT/TYPECHECK and KNOWN ISSUES). Fixed by loading
it with a dynamic `import()` gated behind the configuration check.

## LINT / TYPECHECK

Clean, with three fixes along the way, all mechanical:

1. `workers/indexer/config.ts` validated addresses with viem's own `Address` type
   (`` `0x${string}` ``) but `IndexerRunDeps.addresses` expects the domain's nominal, branded
   `Address` (`@domain/shared/branded`) — the two are structurally related but not directly
   assignable. Fixed by importing the domain type and casting through `unknown` at the one
   validation boundary that needs it, matching how every other file in this codebase constructs a
   branded `Address` from a raw string.
2. `workers/indexer/onchain.ts`'s `client.getLogs({ address: addresses })` rejected a `readonly`
   array where viem expects a mutable one. Fixed with `[...addresses]`.
3. The `getPostgresIndexerStore`/`server-only` issue described above (BUILD) — technically a
   runtime crash, not a lint/typecheck error, but caught and fixed in the same pass.

## SECURITY

STEP 5 AUDIT (`docs/spec/08-security-principles.md`):

| Concern | This TASK |
|---|---|
| **Reprocesar el mismo bloque dos veces no duplica datos** (acceptance) | `activityId = ${txHash}-${logIndex}` is the idempotency key both in `IndexerStore.recordActivity`'s in-memory fake and in `postgres-indexer-store.ts`'s real `INSERT ... ON CONFLICT (tx_hash, log_index) DO NOTHING`; every `MirrorWrite` kind is written with idempotent SQL (upsert or conditional update); proven directly by `run.test.ts`'s idempotency test, not just asserted |
| **Recuperación automática tras caída sin pérdida de eventos** (acceptance) | The cursor advances only after a full, uninterrupted pass — an aborted pass (`AbortSignal`) leaves it untouched, so the next invocation safely redoes the same range; proven directly by `run.test.ts`'s crash-recovery test |
| Malformed on-chain data fails loudly, not silently | `decodeEvent` throws `MalformedEventError` for a recognized event with a missing/wrong-typed field, rather than producing a partially-decoded event |
| No real network/database in tests (`docs/conventions.md` §4) | `createFakeEventSource`/`createInMemoryIndexerStore`/`createFakeLogger` throughout; the Postgres-backed store has no test of its own, matching `infra/db/pool.ts`'s own precedent |
| Worker fails safe when unconfigured | `index.ts` logs and exits rather than crashing or looping when contract addresses, RPC, or database aren't set — verified live, including after fixing the `server-only` crash above |

## PERFORMANCE

`decodeEvent` and `planWrite` are both `O(1)` per event (the `NFFCCompositionRecorded` case is
`O(componentCount)`, ≤20). `runIndexerPass` is `O(n)` over events in the capped block range
(`maxBlockRange`, bounded). `onchain.ts`'s `getEvents` makes one extra `getTransaction` RPC call
per log (to populate `transactionSender`) — not batched; a known, accepted, documented cost, not
escalated as an open issue since it's a local optimization opportunity, not a cross-task
contradiction.

## KNOWN ISSUES

1. **`server-only`-tagged `infra/*` modules can't actually run under `tsx`/`pnpm worker`, even
   once configured.** Discovered while wiring `createPostgresIndexerStore()` into `index.ts` — a
   static import crashed the worker outright. Mitigated locally with a dynamic `import()` gated
   behind the config check, but the same crash still happens the moment the worker is actually
   configured and reaches that line for real — this is a genuine, cross-cutting architecture gap
   (also latent in `nav-materializer`, TASK-23, once it wires its own stores), not something
   fixable unilaterally within TASK-24. Escalated: **`docs/OPEN_ISSUES.md` Issue #7.**
2. **`OfferCancelled` activity rows have `tokenId: null`.** The event carries neither `tokenId` nor
   an actor of its own; `actorAddress` has a reasonable fallback (`transactionSender`), `tokenId`
   does not. Escalated: **`docs/OPEN_ISSUES.md` Issue #8.**
3. **`collection` is not indexed; `CollectionCreated` is not decoded.** Deliberately out of TASK-24's
   literal scope per the Development Plan's own event list, but leaves `docs/spec/09-data-model.md`'s
   `collection` mirror table permanently empty with nothing else in the pipeline to fill it.
   Escalated: **`docs/OPEN_ISSUES.md` Issue #9.**
4. **Not wired into `/nffc/[tokenId]`'s activity feed.** That page still reads
   `fixture-detail.ts`. Wiring it needs both a deployed contract (TASK-31) and a running indexer
   process against real data; the decode/plan/store logic itself doesn't need either to be correct
   and tested. Not logged as an open issue — scope already assigned to a named future TASK (live
   wiring is inherent to TASK-31's deploy step, same reasoning TASK-23's report used).
5. **The Postgres-backed store is genuinely untested against a live database** — the same boundary
   `infra/db/pool.ts` (TASK-04) itself already accepts; real correctness is an integration concern
   (TASK-31/37), not a new gap this TASK introduces.

## ACCEPTANCE CRITERIA

`NFFC_Development_Plan.md` v3.2 TASK-24:

| Criterion | Status | Evidence |
|---|---|---|
| Reprocesar el mismo bloque dos veces no duplica datos | Met | `activityId`/`(tx_hash, log_index)` idempotency key enforced at both the in-memory fake and the real SQL layer; `run.test.ts`'s idempotency test runs the same range twice and shows zero events applied the second time |
| Recuperación automática tras caída sin pérdida de eventos | Met | Cursor advances only after an uninterrupted pass; `run.test.ts`'s crash-recovery test aborts mid-batch, shows the cursor untouched, then a full retry applies every event with none lost |

## PULL REQUEST

Branch `task/TASK-24-indexer`, based on **`main`** (TASK-00…23).

**PR: https://github.com/victorhmlz/nffc-protocol/pull/30** — base `main`.
**CI: https://github.com/victorhmlz/nffc-protocol/actions/runs/34631280833 — success** — both jobs.

**Do not merge** — Project Lead reviews and authorizes.

## NEXT TASK

**TASK-25 — Portfolio** (`NFFC_Development_Plan.md` v3.2, depende de TASK-23, TASK-24). Blocked
until the Project Lead merges this PR and authorizes TASK-25.
