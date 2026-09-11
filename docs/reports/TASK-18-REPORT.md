# TASK 18 REPORT

## STATUS

COMPLETED

`pnpm verify` (lint · typecheck · test · build) green locally — **40 files, 213 tests** (203 → +10).
`pnpm contracts:build` / `pnpm contracts:test` green — **128 Solidity tests**, unchanged (no `.sol`
touched). See PULL REQUEST for CI links once opened.

## OBJECTIVE

Simulation, signing, submission and confirmation of the mint — the end-to-end flow wired to TASK-16's
transaction state machine, generating the market-condition trait (TASK-13) and the art (TASK-12) at
the correct point of the flow (`NFFC_Development_Plan.md` v3.2 TASK-18).

## SCOPE NOTE

TASK-18 depends on TASK-09 (`NFFC.sol`), TASK-12 (art), TASK-13 (mint-condition trait), and TASK-17
(the wizard) — all merged. Like every prior forward-dependent TASK, it is built against the exact
eventual data contracts (`NFFC.mint`'s `MintParams`, the oracle observation shape from TASK-13) with
the missing infrastructure — a deployed `NFFC` (TASK-31), a live price oracle (TASK-22), and
content-addressed pinning — supplied via injected functions that `/create/page.tsx` fixture-backs.

## CHANGES

### `src/lib/wizard/prepare-mint-metadata.ts` (new) — art + trait at the correct point

`prepareMintMetadata(input)` runs immediately before simulation, because `MintParams
.staticMetadataURI` is an **input** to `NFFC.mint`, not something the contract produces:
derives the art seed via TASK-17's `computeCompositionHash` (so the pinned art is byte-identical to
the Step 5 preview), renders it (TASK-12), fetches a best-effort current block + oracle observations
(both injected) to compute the mint-condition trait (TASK-13), computes the static rarity score
(TASK-14), assembles `StaticNffcMetadata` (TASK-11), and pins its canonical serialization (injected
`pin`). Uses a documented placeholder, `PENDING_TOKEN_ID = "pending"`, for the not-yet-known
`tokenId` — see KNOWN ISSUES.

### `src/lib/wizard/use-mint-flow.ts` (new) — prepare/simulate as a phase outside the reducer

`useMintFlow({prepareMetadata, simulateMint, buildMintCall})` composes two phases without modifying
TASK-16's `transactionFlowReducer` at all: a local `isPreparing`/`prepError` pair drives
prepare-then-simulate while the underlying `TransactionState` stays `"idle"`; only on success is
`flow.request(buildMintCall(...))` called, engaging the wallet. A rejection from either
`prepareMetadata` or `simulateMint` surfaces as `error` and returns without ever calling `request`
— provably no wallet interaction happens, since leaving `"idle"` is only possible through the
reducer's own `REQUEST_WALLET` transition.

### `src/components/wizard/step-mint.tsx` (modified) — a dedicated preparing state

Added `isPreparing: boolean`. Renders a `role="status" aria-live="polite"` "Preparing…" message in
place of `TransactionStatus` while art/trait generation and simulation are in flight, so the mint
button/status never falsely reads "idle" during real work. The Mint button is disabled while
preparing or while the transaction is past `idle`/`failed`/`rejected`.

### `src/components/wizard/create-wizard.tsx` (modified) — the new prop boundary

`CreateWizardProps.mint` (the TASK-17 stub bundle) removed; replaced with `prepareMintMetadata`,
`simulateMint`, `buildMintCall`. `CreateWizard` now owns `useMintFlow` internally and renders
`StepMint` from its result.

### `src/app/create/page.tsx` (modified) — honest fixtures

`prepareMintMetadataFixture` wires the real `prepareMintMetadata` with fixture `currentBlock`
(no chain connected yet), `fetchObservations` (flat "no oracle yet" observations), and `pin` (a
self-contained `data:` URI, standing in for real pinning infra). `simulateMintFixture` always
rejects with "NFFC is not deployed yet (TASK-31)" — the honest, live demonstration of the second
acceptance criterion, since there is genuinely no contract to simulate against. `buildMintCall` is
a stub, provably unreachable while simulation always rejects.

### Docs

`docs/mint-flow.md` (new) — the two-phase design, the `prepareMintMetadata` pipeline, the
tokenId-before-mint gap, and what remains fixture. `README.md` — status line, doc link.

## FILES CREATED

```
src/lib/wizard/prepare-mint-metadata.ts
src/lib/wizard/prepare-mint-metadata.test.ts
src/lib/wizard/use-mint-flow.ts
src/lib/wizard/use-mint-flow.test.tsx
docs/mint-flow.md
docs/reports/TASK-18-REPORT.md
```

## FILES MODIFIED

```
src/components/wizard/step-mint.tsx      isPreparing state, no longer trusts TransactionStatus alone
src/components/wizard/create-wizard.tsx  mint prop bundle -> prepareMintMetadata/simulateMint/buildMintCall
src/components/wizard/create-wizard.test.tsx  wrapped in WagmiTestProviders; new prop shape
src/app/create/page.tsx                  real prepareMintMetadata wiring + honest simulateMint fixture
README.md                                status line + doc link
```

Branch is based on `main` (TASK-00…17) — see PULL REQUEST.

## TESTS

`pnpm test` → Vitest, **40 files, 213 tests** (10 new):

```
prepare-mint-metadata.test.ts (6)  injected fns called in the right order; compositionHash matches
                                    computeCompositionHash; segment derived correctly; mintConditionTrait
                                    present; tokenId === PENDING_TOKEN_ID; mintedAtBlock reflects
                                    currentBlock; failures from currentBlock/pin propagate, not swallowed
use-mint-flow.test.tsx (4)         never calls the wallet write when prepareMetadata rejects (state
                                    stays idle, acceptance); never calls the wallet write when
                                    simulateMint rejects (state stays idle, acceptance); isPreparing
                                    true while in flight, cleared after; buildMintCall called and state
                                    leaves idle only after both steps succeed
```

`create-wizard.test.tsx`'s 6 existing tests now render inside `WagmiTestProviders` (required once
`CreateWizard` calls `useMintFlow` → `useTransactionFlow` → wagmi's `useWriteContract`) and pass
unchanged otherwise.

`pnpm contracts:test` → **128 Solidity tests**, unchanged (TASK-18 adds no `.sol`).

## BUILD

`pnpm build` green — same **8 routes**, no new route (TASK-18 only extends `/create`).

## LINT / TYPECHECK

Clean.

## SECURITY

STEP 5 AUDIT (`docs/spec/08-security-principles.md`):

| Concern | This TASK |
|---|---|
| **SUCCESS is never shown before on-chain confirmation** (acceptance) | Structural, unchanged from TASK-16: `transactionFlowReducer` only reaches `"success"` from `"confirming"` on a mined-receipt event; TASK-18 adds no new path into `"success"` |
| **Simulation failures are communicated before a signature is requested, not after** (acceptance) | Structural: `useMintFlow.mint()` calls `flow.request(...)` — the only entry point that can open the wallet — solely after both `prepareMetadata()` and `simulateMint()` resolve without throwing; a rejection from either short-circuits before `request` is reached. Proven directly: `use-mint-flow.test.tsx` asserts the underlying `TransactionState` never leaves `"idle"` when either step rejects |
| No premature wallet interaction from a UI race | `isPreparing` gates the Mint button (`disabled={isPreparing || ...}`), so a second click during prepare/simulate cannot fire a second `request` |
| Pinned metadata content is canonical, not attacker-influenced formatting | Reuses TASK-11's `serializeStaticMetadata` (deterministic canonical JSON), unchanged |
| No secrets, no live contract call yet | `/create`'s `simulateMintFixture` always rejects — nothing calls a contract; `buildMintCallFixture` is unreachable |

## PERFORMANCE

`prepareMintMetadata` is `O(n ≤ 20)` over components plus two injected I/O calls
(`currentBlock`, `fetchObservations`) and one `pin` call — no polling, no retries added by this
TASK. `useMintFlow` adds no re-render loop; `isPreparing` is a single boolean toggled exactly twice
per mint attempt.

## KNOWN ISSUES

1. **The tokenId-before-mint gap.** `NFFC.sol`'s `tokenId` is assigned by a private counter and is
   only known once the mint transaction mines, but the static metadata embeds `tokenId` as a fact
   and must exist before simulation. Resolved with a documented placeholder,
   `PENDING_TOKEN_ID = "pending"`, rather than blocking the flow or inventing a fake id. Re-pinning
   corrected metadata once the true `tokenId` is known is out of scope for TASK-18.
2. **The mint-condition trait is a best-effort, as-of-submission snapshot**, not the eventual mined
   block — `mintedAtBlock` (and the observations computed "at" it) reflect the moment
   `prepareMintMetadata` ran, not the block the transaction actually mines in. A real deployment may
   want to re-derive and re-pin the trait post-confirmation; not attempted here.
3. **No real oracle, pinning, or deployed contract** (TASK-22/30/31 respectively) — `/create/page.tsx`
   fixtures are honest about this: `simulateMint` always rejects with an explicit "not deployed yet"
   message, so the second acceptance criterion is demonstrated live, not merely tested.
4. **No re-pin-and-retry UX** if `pin` succeeds but `simulateMint` then fails — the pinned document
   becomes orphaned (harmless, since it is content-addressed and unreferenced) but is not cleaned up
   or reused on a retry. Acceptable for a first pass; a garbage/dedup concern for real pinning infra
   later.
5. **`useMintFlow`'s `reset()`** clears prep error state but does not re-run `prepareMetadata` — a
   user must click Mint again from scratch after a failure, which re-derives art/trait fresh each
   time (cheap, deterministic) rather than caching the last successful preparation.

## ACCEPTANCE CRITERIA

`NFFC_Development_Plan.md` v3.2 TASK-18:

| Criterion | Status | Evidence |
|---|---|---|
| SUCCESS is never shown before on-chain confirmation | Met | Unmodified `transactionFlowReducer` (TASK-16) — `"success"` reachable only from `"confirming"` on a mined receipt |
| Simulation failures are communicated before a signature is requested, not after | Met | `useMintFlow.mint()` — `request()` is called only after `prepareMetadata` + `simulateMint` both resolve; `use-mint-flow.test.tsx` proves `state` never leaves `"idle"` on either rejection |

## PULL REQUEST

Branch `task/TASK-18-mint-flow`, based on **`main`** (TASK-00…17).

**PR:** to be opened against `main` — link recorded here once created.

**Do not merge** — Project Lead reviews and authorizes.

## NEXT TASK

**TASK-19 — Marketplace Contract** (`NFFC_Development_Plan.md` v3.2). Blocked until the Project
Lead merges this PR and authorizes TASK-19.
