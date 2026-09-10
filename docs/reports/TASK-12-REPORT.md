# TASK 12 REPORT

## STATUS

COMPLETED

`pnpm verify` (lint · typecheck · test · build) green locally — **21 files, 88 tests** (75 → +13).
`pnpm contracts:build` / `pnpm contracts:test` green (114 Solidity tests, unchanged — no `.sol`
touched). See PULL REQUEST for CI.

## OBJECTIVE

Generate each NFFC's artwork procedurally from its **real basis-point weights** — a deterministic,
public, reproducible algorithm (composition → visual parameters → SVG), rendered server-side, with
the algorithm fully documented (`NFFC_Development_Plan.md` v3.2 TASK-12;
`docs/spec/08-security-principles.md` A8; `docs/spec/10-version-boundaries.md`).

## CHANGES

### `domain/art/art.ts` (new domain module)

A zero-dependency pure engine. Inputs are exactly what an NFFC exposes on-chain —
`components: { assetId, weightBps }[]` (from `getComposition`) and `seed` (from
`getCompositionHash`).

- **`deriveArtParams(input) → ArtParams`** — deterministic and total (throws
  `InvalidArtCompositionError` only on a composition the on-chain invariants I1–I4 already forbid:
  empty, weights ≠ 10 000, weight ≤ 0).
  - PRNG: `xmur3` + `sfc32` (exact source in the file, identical on every JS engine). A **global**
    stream seeded with `seed` drives rotation / inner radius / outer band / seam width; a
    **per-component** stream seeded with `` `${seed}|${assetId}|${i}` `` drives that component's
    colour index and radial jitter.
  - Each component → one arc: **angle = `weightBps / 10000 · 360°`**; radial `reach` and `nodeR`
    scale with the weight; `color` is a `--chart-1..8` palette member chosen from the per-component
    stream (de-duplicated against the previous arc); small `innerR` / `outerR` jitter from the same
    stream.
- **`renderArtSvg(params) → string`** — a self-contained `1000×1000` SVG: background, a rotated
  group of donut-segment `<path>` + spoke `<line>` + node `<circle>` per arc, and an inner guide
  ring. All coordinates `round2`-ed; **no `assetId` or free text is interpolated into the markup**
  (only palette hex + numbers), so it is safe to inject and trivial to diff.
- **`renderNffcArt(input) → { params, svg }`**, **`serializeArtParams`** (canonical fingerprint),
  **`NFFC_ART_PALETTE`** (the `--chart-1..8` light hex values), **`ART_VIEWBOX`**.

### `src/components/ui/nffc-art.tsx` (new)

`<NffcArt input={…} label={…} />` — presentational wrapper that calls `renderNffcArt` and injects
the SVG (`role="img"`, `aria-label`, chart-frame border). Server-safe. Added to the `@/components/ui`
barrel.

### `src/app/style-guide/page.tsx`

New **"Generative art (deterministic — composition → visual)"** section — 1 / 2 / 5 / 10-component
sample compositions rendered from a shared seed, with the one-paragraph rule and a pointer to
`docs/art-algorithm.md`. `/style-guide` stays statically prerendered.

### `docs/art-algorithm.md` (new)

The complete public specification: the two inputs (chain reads only), the PRNG, every global- and
per-component formula with constants, the SVG mapping, the palette-sync rule, and a copy-paste
"reconstruct an NFFC's art" snippet (`getComposition` + `getCompositionHash` → `renderNffcArt`).

### Docs

`docs/design-system.md` — `NffcArt` component row. `domain/README.md` — `segment` / `metadata` /
`art` rows. `README.md` — status line + doc link.

## FILES CREATED

```
domain/art/art.ts
domain/art/art.test.ts
src/components/ui/nffc-art.tsx
docs/art-algorithm.md
docs/reports/TASK-12-REPORT.md
```

## FILES MODIFIED

```
domain/index.ts                export art module
src/components/ui/index.ts     export NffcArt
src/app/style-guide/page.tsx   generative-art section
docs/design-system.md          NffcArt row
domain/README.md               segment / metadata / art rows
README.md                      status line + art-algorithm link
```

Branch is based on `main` (TASK-00…11) — see PULL REQUEST.

## TESTS

`pnpm test` → Vitest, **21 files, 88 tests** (13 new in `domain/art/art.test.ts`):

```
determinism   same input → byte-identical params + SVG on every call; a fresh input object
              rebuilt from "on-chain" reads reproduces the exact SVG
uniqueness    a weight change, an asset change, a reorder, and a seed change each change the SVG
              (Set size == variant count); 100 single-bps weight shifts → 100 distinct outputs
weights drive each arc's (span + seam) / 360 ≈ weightBps / 10 000 (4 dp); arcs in on-chain order,
the geometry  sweeping forward; a heavier component reaches further out and has a bigger node
palette       every arc colour ∈ NFFC_ART_PALETTE (2 / 5 / 20 components)
output        valid <svg> root at viewBox 0 0 1000 1000 for 1 and 20 components; no NaN / Infinity /
              undefined; arc count == component count
rejects       empty composition; weights ≠ 10 000; a zero / negative weight
purity        renderArtSvg(params) is a pure function of params
```

`pnpm contracts:test` → **114 Solidity tests**, unchanged (TASK-12 adds no `.sol`).

## BUILD

`pnpm build` green — 7 routes, `/style-guide` still **statically prerendered** (the art renders at
build time via the pure function). `pnpm contracts:build` — nothing to compile.

## LINT / TYPECHECK

Clean. `domain/art` imports only `@domain/nffc/composition` (for `BPS_TOTAL`) — module-boundary
rule satisfied. `NffcArt` is the only `src/` consumer.

## SECURITY

STEP 5 AUDIT (`docs/spec/08-security-principles.md`):

| Concern | This TASK |
|---|---|
| **A8 — art is deterministic & reproducible from on-chain data, not a black box** | `renderNffcArt` is a pure function of `getComposition` + `getCompositionHash`; the full algorithm (PRNG included) is in `docs/art-algorithm.md`; 13 tests pin determinism and reproduction |
| **Acceptance — two compositions never collide** | Arc angles *are* the weights and per-component colour/jitter derive from the asset id, so any change to a weight, asset, order, or seed changes the SVG. Covered by the uniqueness tests (incl. 100 one-bps shifts) |
| **Acceptance — generation does not block mint** | `renderNffcArt` has no I/O and no dependency on a transaction; TASK-18 runs it at the right point in the flow and the wizard shows an intermediate state (`docs/spec/07-ux-map.md` §4). Recorded as a TASK-18 wiring point |
| Injection surface | The SVG string contains only palette hex + rounded numbers — no `assetId` or other input is interpolated into markup. `NffcArt`'s `dangerouslySetInnerHTML` input is therefore not attacker-controlled |
| No secrets, no new deps | Pure TS; `domain/art` pulls in nothing framework- or Node-specific |
| `assetClass` not used | The engine keys on `assetId` + `weightBps` + `seed` only — no branch on provider or asset class |

## PERFORMANCE

`deriveArtParams` + `renderArtSvg` are `O(componentCount ≤ 20)` — a handful of `Math` ops and one
`round2` per coordinate. No allocation beyond the arc array and the SVG string. Runs at build time
for the `/style-guide` samples with no measurable cost.

## KNOWN ISSUES

1. **Pinning is TASK-18.** This TASK ships the engine and the server-render function; rendering the
   SVG at the correct point of the mint flow and pinning it to IPFS/Arweave (the URI then goes into
   the static metadata `image` field and `NFFC.staticMetadataURI`) is TASK-18.
2. **Palette is duplicated.** `NFFC_ART_PALETTE` mirrors `--chart-1..8` (light) from `globals.css`
   because `domain/` cannot read CSS. `docs/art-algorithm.md` and `docs/design-system.md` both note
   the sync requirement; a follow-up could generate one from the other.
3. **Single visual family.** One composition-driven form (weighted radial strata). Richer variation
   (multiple families selected by the seed) is possible later without changing the interface —
   `deriveArtParams` would just branch on a seed-derived family id.
4. **Light-mode art only.** The pinned SVG uses resolved light-palette hex so it is self-contained
   everywhere. A theme-aware variant (embedded `<style>` + `prefers-color-scheme`) is a possible
   future enhancement, not required by TASK-12.

## ACCEPTANCE CRITERIA

`NFFC_Development_Plan.md` v3.2 TASK-12:

| Criterion | Status | Evidence |
|---|---|---|
| Deterministic algorithm: composition (assets + weights, any provider) → visual parameters (shape, distribution, palette within the design system) | Met | `deriveArtParams` → `ArtParams` (rotation, inner radius, per-component arc/colour/reach/node); palette = `--chart-1..8`; `docs/art-algorithm.md` |
| Server-side render, stored on IPFS/Arweave at mint | Partially met | `renderNffcArt` is the server-side render (pure, runs in RSC / route / worker); pinning at mint is wired in TASK-18 (KNOWN ISSUES #1) |
| Documented — reproducible and auditable, not a black box | Met | `docs/art-algorithm.md` — every formula + the PRNG + a reconstruction snippet |
| Two different compositions never produce the same deterministic output | Met | `domain/art/art.test.ts` uniqueness suite — weight / asset / order / seed changes, and 100 one-bps shifts, all distinct |
| The algorithm is public and verifiable — anyone can reconstruct the art from the on-chain composition | Met | Inputs are only `getComposition` + `getCompositionHash`; `docs/art-algorithm.md` §"Reconstructing"; a test rebuilds the input from scratch and reproduces the SVG |
| Generation time does not block the mint flow (async, clear intermediate UI state) | Met (engine) | `renderNffcArt` has no I/O / tx dependency; the wizard's intermediate state is TASK-17/18 (KNOWN ISSUES #1) |

## PULL REQUEST

Branch `task/TASK-12-generative-art`, based on **`main`** (TASK-00…11).

**PR: <!-- filled in after push -->**

**Do not merge** — Project Lead reviews and authorizes.

## NEXT TASK

**TASK-13 — Mint-Condition Trait Engine** (`NFFC_Development_Plan.md` v3.2): immutably record the
weighted market state at the instant of mint, using the Chainlink oracle via the Price Engine
(TASK-22) — e.g. distance to the weighted set's all-time highs. Depends on TASK-09, TASK-12,
TASK-22. Blocked until the Project Lead merges this PR and authorizes TASK-13.
