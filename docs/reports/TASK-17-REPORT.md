# TASK 17 REPORT

## STATUS

COMPLETED

`pnpm verify` (lint · typecheck · test · build) green locally — **38 files, 203 tests** (168 → +35).
`pnpm contracts:build` / `pnpm contracts:test` green — **128 Solidity tests**, unchanged (no `.sol`
touched). See PULL REQUEST for CI.

## OBJECTIVE

The complete 7-step create flow — basic information, asset selection (any provider), weights,
validation, preview, fees, mint — with per-step validation and a generative-art preview before
confirming (`NFFC_Development_Plan.md` v3.2 TASK-17; `docs/spec/07-ux-map.md` §4).

## SCOPE NOTE

TASK-17 depends on TASK-07/12/16 (all merged) but its full mint path also touches TASK-09's
deployed contract (TASK-31), the fee curve (TASK-30), and the asset catalog (indexer, TASK-20/24)
— none of which exist yet. Following the pattern of every prior forward-dependent TASK in this
project, `CreateWizard` is built against the **exact data contracts** those will fill in
(`AvailableAsset`, `RepresentationLookup`, `FeeQuote`, TASK-16's `TransactionState`), with the
`/create` page supplying documented fixtures. This is, notably, **the first real product surface**
in the repository — every prior TASK's UI lived only on `/style-guide`.

## CHANGES

### `domain/nffc/validate-composition.ts` (new) — the off-chain I1–I8 mirror

Named as TASK-17's job in `domain/nffc/composition.ts`'s own header since TASK-09.
`validateComposition(components, lookup)` mirrors `NFFC.sol`'s mint-time checks but, unlike the
contract (which reverts on the first violation), **collects every issue in one pass** — Step 4
shows the user everything wrong at once, in plain language, not one revert at a time. Takes a
`RepresentationLookup` (`isActiveRepresentation`, `resolvesTo`) for I5/I6 — a real caller wires it
to the registry/indexer.

### `src/lib/wizard/composition-hash.ts` (new) — the exact-preview guarantee

`computeCompositionHash(components)` — `keccak256(abi.encode(comps))` via viem's ABI encoder, over
the identical `(bytes32,bytes32,uint16)[]` shape `NFFC.sol`'s `mint()` hashes. Step 5 seeds
`renderNffcArt` (TASK-12) with this value, so the preview is byte-identical to
`NFFC.getCompositionHash(tokenId)` post-mint — the literal TASK-17 acceptance criterion, proven by
a test that re-derives the SVG from the same seed and diffs it against what the rendered preview
produced.

### `src/lib/wizard/wizard-state.ts` (new) — the step machine as the acceptance guarantee

`wizardReducer` — the same design as TASK-16's `transactionFlowReducer`: a step can only be left
forward when its gate holds, and `GOTO` never moves ahead of the current step (only a gated `NEXT`
advances one step at a time):

- `validation → preview` requires `validation.ok === true` — the art preview cannot render before
  I1–I8 pass.
- `fees → mint` requires `ACKNOWLEDGE_FEES`, dispatchable only by a rendered Fees step — so the fee
  total is unconditionally seen before Mint is reachable, **structurally**.
- `ADD_ASSET` / `REMOVE_ASSET` / `SET_WEIGHT` reset `validation` and `feesAcknowledged` — editing
  the composition can never carry a stale pass through the gates.

### `src/components/wizard/` (new) — the 7 step components + orchestrator

`CreateWizard` (`useReducer(wizardReducer, …)`) + `WizardProgress` + one component per step
(`StepBasicInfo`, `StepAssetSelection`, `StepWeights`, `StepValidation`, `StepPreview`, `StepFees`,
`StepMint`), reusing existing primitives (`Field`, `Table`, `Badge`, `NffcArt`, `CompositionTable`,
`SegmentBadge`, `StaticRarityStat`, `TransactionStatus`). `StepAssetSelection` renders **one single
table** for both Stock Tokens and native crypto — no tab, no sub-flow, no address field.

### `src/app/create/page.tsx` (new) — the `/create` route

Client-rendered (ux-map: wallet + signing). Supplies the fixtures `CreateWizard` needs: an
`AvailableAsset[]` mirroring `config/robinhood/stock-tokens.example.json` +
`config/crypto/native-tokens.example.json` (with real `bytes32` ids, computed the same way
`AssetIdentityRegistry.computeAssetId` would), a `RepresentationLookup` over that same list, and an
affine `quoteFees` placeholder. `mint.onMint` is a documented no-op until TASK-18/31.

### Docs

`docs/create-wizard.md` (new) — the 7 steps, the reducer-as-guarantee explanation, the hash-parity
proof, the fee/mint prop boundary. `docs/design-system.md` — `CreateWizard` row. `README.md` —
status line (the first to say a product surface exists), doc link.

## FILES CREATED

```
domain/nffc/validate-composition.ts
domain/nffc/validate-composition.test.ts
src/lib/wizard/types.ts
src/lib/wizard/composition-hash.ts
src/lib/wizard/composition-hash.test.ts
src/lib/wizard/wizard-state.ts
src/lib/wizard/wizard-state.test.ts
src/components/wizard/wizard-progress.tsx
src/components/wizard/step-basic-info.tsx
src/components/wizard/step-asset-selection.tsx
src/components/wizard/step-weights.tsx
src/components/wizard/step-validation.tsx
src/components/wizard/step-preview.tsx
src/components/wizard/step-fees.tsx
src/components/wizard/step-mint.tsx
src/components/wizard/create-wizard.tsx
src/components/wizard/create-wizard.test.tsx
src/app/create/page.tsx
docs/create-wizard.md
docs/reports/TASK-17-REPORT.md
```

## FILES MODIFIED

```
domain/index.ts          export validate-composition
docs/design-system.md    CreateWizard row
README.md                status line + doc link
```

Branch is based on `main` (TASK-00…16) — see PULL REQUEST.

## TESTS

`pnpm test` → Vitest, **38 files, 203 tests** (35 new):

```
validate-composition.test.ts (11)  happy path (1 & 20 components); collects every violation in one
                                    pass (I3+I4+I2 together); I1/I2/I5/I6 individually; I5 suppresses
                                    a redundant I6 for the same component; plain-language messages
composition-hash.test.ts (6)       32-byte hex output; deterministic; changes on weight / order /
                                    asset change; single-component case
wizard-state.test.ts (12)          the full happy path one step at a time; every forward gate's
                                    failure case incl. the two literal acceptance gates (validation
                                    -> preview, fees -> mint); composition edits invalidate stale
                                    validation/fees; BACK; GOTO ahead rejected; step order
create-wizard.test.tsx (6)         asset selector shows both providers in one table (acceptance);
                                    validation blocks preview with plain-language issues; the preview
                                    art is byte-identical to a fresh renderNffcArt over the same
                                    computeCompositionHash seed (acceptance); segment + composition
                                    table render; fee total shown before Mint is reachable, and GOTO
                                    can't skip to Mint (acceptance)
```

`pnpm contracts:test` → **128 Solidity tests**, unchanged (TASK-17 adds no `.sol`).

## BUILD

`pnpm build` green — **8 routes** now (`/create` added), `/create` and `/style-guide` both
statically prerendered.

## LINT / TYPECHECK

Clean.

## SECURITY

STEP 5 AUDIT (`docs/spec/08-security-principles.md`):

| Concern | This TASK |
|---|---|
| **Asset selector: one surface, no separate flows, no free-text address** (acceptance) | `StepAssetSelection` renders a single `<table>` over `availableAssets`; there is no input field for an address anywhere in the wizard — only `Add`/`Remove` on pre-registered entries |
| **Art preview matches the exact post-mint result** (acceptance) | `computeCompositionHash` uses viem's standard ABI encoder over the identical tuple shape `NFFC.sol` hashes; `create-wizard.test.tsx` proves the rendered preview reproduces byte-identically from that seed |
| **Fee total shown before signing, never after** (acceptance) | Structural: `wizardReducer`'s `fees → mint` gate requires `ACKNOWLEDGE_FEES`, only dispatchable from a rendered Fees step; `GOTO` cannot jump ahead of the current step, so there is no path to Mint that skips Fees |
| No arbitrary address becomes a component (S9, carried from TASK-05) | `validateComposition`'s I5/I6 require the representation to be active and resolve to the stated asset via `RepresentationLookup` — the wizard cannot construct a component the registry hasn't already vetted |
| No secrets, no premature mint | `/create`'s `onMint` is a documented no-op; nothing calls a contract yet |

## PERFORMANCE

`validateComposition` / `computeCompositionHash` / `wizardReducer` are all `O(n ≤ 20)`. No network
calls anywhere in the wizard itself — `availableAssets`, `lookup`, and `quoteFees` are all supplied
synchronously by the caller.

## KNOWN ISSUES

1. **`onMint` is a stub.** Wiring Step 7 to a real `NFFC.mint` transaction (simulate → sign → submit
   → confirm, never showing SUCCESS before confirmation, surfacing simulation failures before
   signing) is TASK-18's explicit acceptance criteria — deliberately not this TASK's.
2. **Fees are a fixture formula**, not a live `Collection.quoteCollectionCreationFee` /
   `IFeeConfig.mintFee` read — those exist as contracts (TASK-10) or don't yet (TASK-30), and
   neither has a deployed address (TASK-31).
3. **The asset catalog is a fixture**, mirroring the example token config files. The indexer
   (TASK-20/24) is the real source.
4. **No back-navigation warning.** Clicking an earlier step via `WizardProgress` (`GOTO`) does not
   warn that later-step state (e.g. fee acknowledgement) will reset on the next edit — acceptable
   for a first pass, a UX polish item for later.
5. **No collection selection UI.** `BasicInfo.collectionMode` is fixed to `"new"` in `StepBasicInfo`;
   the "existing collection" path from ux-map step 1 is modeled in the type but not yet exposed in
   the form.

## ACCEPTANCE CRITERIA

`NFFC_Development_Plan.md` v3.2 TASK-17:

| Criterion | Status | Evidence |
|---|---|---|
| Asset selector shows Stock Tokens and native crypto on the same surface, not as separate flows | Met | `StepAssetSelection` — one table, both providers; `create-wizard.test.tsx` |
| Generated art preview matches exactly the post-mint result | Met | `computeCompositionHash` (viem ABI encoder, identical tuple shape to `NFFC.sol`); byte-identical-SVG test |
| User sees the total fee before signing, never after | Met | `wizardReducer`'s `fees → mint` gate is structural, not a UI convention; tested incl. the `GOTO`-skip case |

## PULL REQUEST

Branch `task/TASK-17-create-wizard`, based on **`main`** (TASK-00…16).

**PR: <!-- filled in after push -->**

**Do not merge** — Project Lead reviews and authorizes.

## NEXT TASK

**TASK-18 — Complete Mint Flow** (`NFFC_Development_Plan.md` v3.2): connect Step 7 to TASK-16's
state machine end to end, generating the mint-condition trait (TASK-13) and the art (TASK-12) at
the correct point in the flow. Never shows SUCCESS before on-chain confirmation; simulation
failures surface before a signature is requested, not after. Depends on TASK-09, TASK-12, TASK-13,
TASK-17. Blocked until the Project Lead merges this PR and authorizes TASK-18.
