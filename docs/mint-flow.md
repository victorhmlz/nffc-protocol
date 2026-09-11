# Mint flow (TASK-18)

Step 7 of `/create` (`docs/create-wizard.md`) — prepare → simulate → sign → submit → confirm,
wiring the wizard's finished composition into `NFFC.mint` via TASK-16's wallet transaction state
machine (`src/lib/wallet/transaction-flow.ts`). Depends on TASK-09 (`NFFC.sol`), TASK-12 (art),
TASK-13 (mint-condition trait), TASK-17 (wizard).

## Acceptance criteria (`NFFC_Development_Plan.md` v3.2)

- **SUCCESS is never shown before on-chain confirmation.**
- **Simulation failures are communicated before a signature is requested, not after.**

## Two phases, deliberately not one state machine

TASK-16's `transactionFlowReducer` already guarantees the first criterion structurally: `"success"`
is reachable only via a mined-receipt event, from `"confirming"`. TASK-18 does **not** touch that
reducer or add a 9th state to `TransactionState` — a mint has a real pre-flight phase (build the
metadata, then simulate) that happens entirely *before* `transactionFlowReducer` is engaged at all.

`useMintFlow` (`src/lib/wizard/use-mint-flow.ts`) composes the two phases:

1. **Prepare + simulate** (`isPreparing: true`, underlying `state` stays `"idle"`):
   - `prepareMetadata()` — calls `prepareMintMetadata` (below) to build and pin the static metadata.
   - `simulateMint(staticMetadataURI)` — a dry-run of `NFFC.mint`; rejecting here (e.g. a revert
     reason from `eth_call`) surfaces immediately as `error`, and `flow.request(...)` — the only
     thing that can open the wallet — is never called. This is directly observable in tests: the
     underlying `TransactionState` never leaves `"idle"` on a prepare/simulate failure.
2. **Sign → submit → confirm** (`transactionFlowReducer`, unchanged from TASK-16): only entered
   once both steps above resolve, via `buildMintCall(staticMetadataURI)` handed to
   `flow.request(...)`.

`StepMint` (`src/components/wizard/step-mint.tsx`) renders `isPreparing` as its own
`role="status"` message instead of `TransactionStatus`, so a user never sees a blank/idle mint
button while art + trait generation and simulation are in flight, and never sees the transaction
status widget claim "idle" while real work is happening.

## `prepareMintMetadata` — generating the trait and art at the correct point

`src/lib/wizard/prepare-mint-metadata.ts` runs immediately before simulation, because
`MintParams.staticMetadataURI` is an **input** to `NFFC.mint`, not something the contract produces:

1. Derive the art seed via `computeCompositionHash` (TASK-17) — the same hash the Step 5 preview
   used, so the pinned art is byte-identical to what the user already saw.
2. Render the art (TASK-12: `renderNffcArt`).
3. Fetch a best-effort current block + oracle observations (both injected) and compute the
   mint-condition trait (TASK-13: `computeMintCondition` → `toMetadataTrait`).
4. Compute the static rarity score (TASK-14: `staticRarityScore`).
5. Assemble `StaticNffcMetadata` (TASK-11: `buildStaticNffcMetadata`) and pin its canonical
   serialization (injected `pin`), returning the resulting URI.

All I/O — `currentBlock`, `fetchObservations`, `pin` — is injected, per `docs/conventions.md` §4;
`/create/page.tsx` wires fixtures until the real oracle (TASK-22) and pinning infra exist.

### The tokenId-before-mint gap

The ERC-721 `tokenId` is assigned by `NFFC.sol` from a private counter and is only known once the
mint transaction mines — but the static metadata (which embeds `tokenId` as a fact) must exist
*before* the transaction is even simulated. TASK-18 resolves this pragmatically with a documented
placeholder, `PENDING_TOKEN_ID = "pending"`, rather than inventing a fake id or blocking the flow.
Likewise, `mintedAtBlock` — and therefore the mint-condition trait, which is computed from
observations "at" that block — necessarily reflects a **best-effort, as-of-submission** snapshot,
not the block the transaction eventually mines in. This is a real architectural gap, not silently
resolved: see KNOWN ISSUES in `docs/reports/TASK-18-REPORT.md`. Re-pinning corrected metadata once
the true `tokenId`/`mintedAtBlock` are known is out of scope for TASK-18.

## What's still a fixture

`/create/page.tsx` wires:
- `prepareMintMetadata` → the real `prepareMintMetadata`, with fixture `currentBlock` (`0`),
  `fetchObservations` (a flat "no oracle yet" observation) and `pin` (a `data:` URI) — honest about
  there being no deployed price engine (TASK-22) or content-addressed pinning infra yet.
- `simulateMint` → always rejects with "NFFC is not deployed yet (TASK-31)" — the honest, live
  demonstration of the second acceptance criterion: there is no contract to simulate against yet,
  so the flow correctly refuses to proceed to a signature, every time, in production as much as in
  tests.
- `buildMintCall` → a stub, provably unreachable while `simulateMint` always rejects.

Once TASK-31 deploys `NFFC` (and TASK-22/TASK-30 land the oracle + real fee config), these three
fixtures are replaced with real implementations; `useMintFlow`, `StepMint`, and
`prepareMintMetadata` need no changes.
