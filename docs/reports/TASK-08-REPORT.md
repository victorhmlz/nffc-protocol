# TASK 08 REPORT

## STATUS

COMPLETED

`pnpm verify` (lint · typecheck · test · build) green locally. Both CI jobs on PR #9 pass —
`verify` and `contracts` (`hardhat compile` + **61 Solidity tests**). See PULL REQUEST.

## OBJECTIVE

Label every NFFC `CRYPTO_ONLY` / `STOCK_ONLY` / `MIXED` — **derived from the composition, never
declared** — reflecting the geographic-eligibility difference between compositions with and without
a tokenized equity (`NFFC_Development_Plan.md` v3.2 TASK-08; `docs/spec/02-domain-model.md` §2.5,
`docs/spec/07-ux-map.md` §6, Whitepaper §14).

## CHANGES

### Derivation — off-chain (`domain/nffc/segment.ts`)

- `deriveSegment(isCryptoNative: readonly boolean[]) → CompositionSegment` — the canonical form,
  matching the on-chain library. All-crypto → `CRYPTO_ONLY`; all-stock → `STOCK_ONLY`; any mix →
  `MIXED`; empty → `EmptyCompositionError`.
- `deriveSegmentFromClasses(readonly AssetClass[])` — convenience: `"CRYPTO"` → crypto, else stock.
- `SEGMENT_META` — per segment: `label`, `geoRestricted: boolean`, `note` (the disclosure copy).
  `isGeoRestricted(segment)`. `STOCK_ONLY` and `MIXED` are geo-restricted; `CRYPTO_ONLY` is not.
- Exported from `@domain` barrel. First real *logic* module in `domain/` (types-only until now).

### Derivation — on-chain (`contracts/lib/CompositionSegmentLib.sol`)

- `library` with `enum Segment { CRYPTO_ONLY /*0*/, STOCK_ONLY /*1*/, MIXED /*2*/ }` — order matches
  `INFFC.getSegment` (`docs/spec/04-contract-interfaces.md` §4).
- `deriveSegment(bool[] memory isCryptoNative) internal pure returns (Segment)` — reverts
  `EmptyComposition` on an empty array.
- `NFFC.sol` (TASK-09) will call this at mint, resolving each component's flag from the registry —
  the minter cannot pass a segment. **`RepresentationRegistry` is unchanged.**

### UI (`src/components/ui/segment-badge.tsx`)

- `SegmentBadge` — the derived segment as a `Badge` (variant per segment). Presentational; the
  segment is computed, never chosen here.
- `GeoEligibilityNotice` — the geographic-eligibility disclosure. For `STOCK_ONLY` / `MIXED`: "not
  available to US persons; restricted in the UK, Canada, Switzerland and others" (Whitepaper §14),
  styled with the warning tone + `Globe` icon. For `CRYPTO_ONLY`: the not-restricted note.
  `role="note"`. Copy is legal-reviewed before mainnet (TASK-40).
- Added to the `@/components/ui` barrel and a `/style-guide` section.

### Docs

`contracts/README.md` rewritten (adapters + lib), `docs/design-system.md` §4 component table,
`README.md` status.

## FILES CREATED

```
domain/nffc/segment.ts
domain/nffc/segment.test.ts
contracts/lib/CompositionSegmentLib.sol
contracts/lib/CompositionSegmentLib.t.sol
src/components/ui/segment-badge.tsx
src/components/ui/segment-badge.test.tsx
docs/reports/TASK-08-REPORT.md
```

## FILES MODIFIED

```
domain/index.ts                    export segment.ts
src/components/ui/index.ts         export SegmentBadge / GeoEligibilityNotice
src/app/style-guide/page.tsx       new section
contracts/README.md                rewritten
docs/design-system.md              §4 component table
README.md                          status
```

Branch is based on `task/TASK-07-crypto-adapter` (stacked — see PULL REQUEST).

## TESTS

`pnpm test` → Vitest, **17 files, 56 tests** (10 new):

```
✓ domain/nffc/segment.test.ts (7)        all-crypto/stock/mixed; empty rejected; deriveSegmentFromClasses;
                                          SEGMENT_META geo flags + labels
✓ src/components/ui/segment-badge.test.tsx (3)  labels each segment; STOCK_ONLY/MIXED show the
                                          restriction copy; CRYPTO_ONLY shows the not-restricted note
```

`pnpm contracts:test` (CI) → **61 Solidity tests** (6 new in `CompositionSegmentLib`): all-crypto →
`CRYPTO_ONLY`, all-stock → `STOCK_ONLY`, mix → `MIXED`, empty reverts `EmptyComposition`, enum
ordering `{0,1,2}` matches `INFFC`, and a fuzz test over random `bool[]` (length 1–20) against an
inline reference.

## BUILD

`pnpm build` (JS) green — 5 routes, `/style-guide` still static. `pnpm contracts:build` (CI) —
`hardhat compile` clean (`CompositionSegmentLib` is an inlined internal-only library, no deployed
bytecode). Both CI jobs green on the first push.

## LINT / TYPECHECK

Clean. `deriveSegment` and the UI component typecheck against the existing `CompositionSegment` type
(`domain/nffc/composition.ts`, TASK-02).

## SECURITY

STEP 5 AUDIT (`docs/spec/08-security-principles.md`, `docs/spec/07-ux-map.md`):

| Concern | This TASK |
|---|---|
| **Segment is derived, never declared** | On-chain: `NFFC.sol` (TASK-09) computes it from `CompositionSegmentLib.deriveSegment` over registry-resolved flags — no mint parameter. Off-chain: the indexer derives the `nffc.segment` column from that on-chain value, not from input. `deriveSegment` is pure and total (reverts only on the impossible empty case) |
| Geographic-eligibility disclosure present | `GeoEligibilityNotice` renders for `STOCK_ONLY` / `MIXED` with the Whitepaper §14 restriction language; shown wherever a segment is displayed. Legal review of the exact copy is a TASK-40 gate — recorded, not closed |
| `assetClass` used only where sanctioned | `deriveSegmentFromClasses` maps `AssetClass` → crypto/stock for segmentation — one of the two uses the spec sanctions (`docs/spec/05-adapter-architecture.md` §2); it never gates a privileged path |
| No contract-surface risk | `CompositionSegmentLib` is `pure`, no storage, no external calls; `RepresentationRegistry` untouched |

## PERFORMANCE

Not applicable — a pure function each side. On-chain: one `O(n≤20)` loop at mint.

## KNOWN ISSUES

1. **`getSegment` on `NFFC.sol` is TASK-09.** This TASK ships the derivation (both sides) and the
   UI; wiring it into the mint flow + storing the segment is TASK-09, and surfacing it in filters is
   TASK-20.
2. **Geo-disclosure copy is provisional.** Legal review of the US/UK/CA/CH wording is a TASK-40
   requirement (Whitepaper §14); the strings are centralised in `SEGMENT_META` for a one-place edit.
3. Carried: local Node 22.8 (blocks local Hardhat + `pnpm worker`); `vite@6` / `jsdom@25` overrides.

## ACCEPTANCE CRITERIA

`NFFC_Development_Plan.md` v3.2 TASK-08:

| Criterion | Status | Evidence |
|---|---|---|
| Label each NFFC 100%-crypto / 100%-Stock-Token / mixed | Met | `CompositionSegment` = `CRYPTO_ONLY` / `STOCK_ONLY` / `MIXED`; `deriveSegment` (TS) + `CompositionSegmentLib.deriveSegment` (Solidity) |
| Derived automatically from the composition, never declared manually | Met | pure derivation both sides; `NFFC.sol` computes it at mint from the registry (TASK-09) — no mint parameter; indexer derives the off-chain column from on-chain |
| The UI communicates the geographic-availability difference between crypto-only and mixed compositions (Whitepaper §14) | Met | `GeoEligibilityNotice` — restriction language for `STOCK_ONLY` / `MIXED`, not-restricted note for `CRYPTO_ONLY`; on `/style-guide`; copy is a TASK-40 legal-review item |

## PULL REQUEST

Branch `task/TASK-08-composition-segmentation`, based on **`task/TASK-07-crypto-adapter`** (stacked;
TASK-01 → … → 08 not yet merged).

**PR: https://github.com/victorhmlz/nffc-protocol/pull/9** — base `task/TASK-07-crypto-adapter`.
**CI: https://github.com/victorhmlz/nffc-protocol/actions/runs/34468115754 — success** — both jobs
(`lint · typecheck · test · build`; `solidity · compile · test` — 61 Solidity tests).

**Do not merge** — Project Lead reviews and authorizes. Merge order: #1 → … → #8 → this PR.

## CORRECTION — 2026-09-11 (found during TASK-20 review, fixed in PR #25)

The SECURITY row above ("Geographic-eligibility disclosure present... shown wherever a segment is
displayed") and the ACCEPTANCE CRITERIA row for the Whitepaper §14 criterion were accurate at the
time they were written — TASK-08 predates any real product surface — but became **stale** the
moment a real surface started displaying a segment without also rendering
`GeoEligibilityNotice`:

- TASK-17 (`StepPreview`, the create-wizard's post-mint preview) rendered `SegmentBadge` alone.
- TASK-20 (`NffcCard`, the `/market` grid) did the same.

Until the TASK-20 review caught this, `GeoEligibilityNotice` was reachable **only** on
`/style-guide` (the design-system showcase) — never in a real user-facing flow, despite being
built and tested since TASK-08. This was not re-examined by either TASK-17 or TASK-20 at the time,
since neither TASK's own acceptance criteria named the geo-disclosure explicitly (that language
lives only in TASK-08's).

**Fixed in PR #25**: `GeoEligibilityNotice` is now wired into both `StepPreview` and `NffcCard`,
each with a test asserting it renders. The original ACCEPTANCE CRITERIA table above is left
unchanged (it was correct as of TASK-08 in isolation); this note is the record of where the claim
stopped holding and when it was corrected. See `docs/reports/TASK-20-REPORT.md` CHANGES for the
implementation detail.

## NEXT TASK

**TASK-09 — NFFC Contract (ERC-721 Core)** (`NFFC_Development_Plan.md` v3.2): `NFFC.sol` with the
composition invariants (1–20 components, Σ = 10 000 BPS, no duplicate `assetId`, `weightBps > 0`,
every representation registered **and** active at mint, resolves to its `assetId`), immutable
composition post-mint, complete mint events, `getSegment` via `CompositionSegmentLib`, `getStaticRarity`
hook (TASK-14). Exhaustive tests incl. edge cases and mixed providers. Depends on TASK-05. Blocked
until the Project Lead merges this PR and authorizes TASK-09.
