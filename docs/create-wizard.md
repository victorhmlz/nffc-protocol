# Create Wizard

The `/create` route — a 7-step flow from basic information to mint, wallet-gated end to end
(`NFFC_Development_Plan.md` v3.2 TASK-17; `docs/spec/07-ux-map.md` §4). Established in TASK-17.

## The 7 steps

| # | Step | What it does |
|---|---|---|
| 1 | Basic information | Name, description. |
| 2 | Asset selection | Stock Tokens **and** native crypto, one list, no separate flows or address field. |
| 3 | Weights | Assign bps per component; a live running total toward 10,000. |
| 4 | Validation | The full I1–I8 check, every issue in plain language at once. |
| 5 | Preview | The exact post-mint generative art, segment, static rarity, composition table. |
| 6 | Fees | Collection + mint fee + gas estimate + total, in full, before signing. |
| 7 | Mint | Simulate → sign → submit → confirm, driven by TASK-16's transaction state machine. |

## The step reducer is the acceptance guarantee, not just the UI

`src/lib/wizard/wizard-state.ts` — `wizardReducer`, the same design as TASK-16's
`transactionFlowReducer`: a step can only be left forward when `canAdvance(state)`
holds for it, and `GOTO` can never move ahead of the current step (only a gated
`NEXT` advances). Concretely:

- `validation → preview` requires `state.validation.ok === true` — the art
  preview literally cannot render until I1–I8 pass.
- `fees → mint` requires `ACKNOWLEDGE_FEES`, which only the rendered Fees step
  can dispatch — so the total is unconditionally seen before Mint is
  reachable, structurally, not by UI convention.
- Editing the composition (`ADD_ASSET` / `REMOVE_ASSET` / `SET_WEIGHT`) resets
  `validation` and `feesAcknowledged` — a stale pass can never carry a changed
  composition through the gates.

Fully unit-tested: the whole happy path one step at a time, every gate's
failure case, `GOTO`'s forward-jump rejection.

## Composition validation (I1–I8) — `domain/nffc/validate-composition.ts`

The off-chain mirror of `NFFC.sol`'s mint-time checks, named as TASK-17's job
in `domain/nffc/composition.ts`'s own header since TASK-09. Unlike the
contract, which reverts on the first violation, `validateComposition` collects
**every** issue in one pass (`ok`, `issues[]`, `weightSumBps`) — Step 4 shows
the user everything wrong at once. Takes a `RepresentationLookup`
(`isActiveRepresentation`, `resolvesTo`) for I5/I6 — a real caller wires it to
the registry/indexer; the wizard demo uses a fixture.

## The art preview matches the exact post-mint result (acceptance)

`src/lib/wizard/composition-hash.ts` — `computeCompositionHash(components)`
computes `keccak256(abi.encode(comps))` with viem's ABI encoder, over the same
`(bytes32 assetId, bytes32 representationId, uint16 weightBps)[]` shape
`NFFC.sol`'s `mint()` hashes — the identical bytes, the identical hash. Step 5
seeds `renderNffcArt` (TASK-12) with this exact value, so the preview is
byte-identical to what `NFFC.getCompositionHash(tokenId)` returns once minted,
proven by a test that re-derives the SVG from the same seed and compares it to
what Step 5 rendered.

## Fees (Step 6) and Mint (Step 7)

Neither the on-chain fee quote (`Collection.quoteCollectionCreationFee`, TASK-10; the mint fee,
`NFFC.quoteMintFee`, wired to `FeeConfig.sol` in TASK-30) nor a deployed `NFFC` address (TASK-31)
exist yet. `CreateWizard` takes both as
props — `quoteFees: (componentCount) => FeeQuote` and `mint: { state, error,
onMint }` — so the wizard itself is contract-agnostic; `/create` supplies a
documented fixture for both until deployment. `StepMint` renders TASK-16's
`TransactionStatus` over whatever `state` the caller's `useTransactionFlow()`
produces; wiring `onMint` to a real `NFFC.mint` call is TASK-18.

## Asset universe (Step 2)

`AvailableAsset` (`src/lib/wizard/types.ts`) is a flat, display-ready view —
not the split `AssetIdentity` / `Representation` domain shape — of a
registered, active representation. `/create` supplies a fixture mirroring
`config/robinhood/stock-tokens.example.json` +
`config/crypto/native-tokens.example.json`; a real page reads this from the
indexer (TASK-20/24).

## Downstream

| TASK | Uses this |
|---|---|
| 18 | wires `onMint` to a real `NFFC.mint` call via `useTransactionFlow`; never shows SUCCESS before confirmation; surfaces simulation failures before signing |
| 20 / 24 | the indexer supplies the real `AvailableAsset[]` and `RepresentationLookup` |
| 30 / 31 | the real `FeeQuote` (on-chain quotes + gas simulation) once `FeeConfig` and `NFFC` are deployed |
