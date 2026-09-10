# Generative Art Algorithm

The NFFC artwork is a **deterministic pure function of the on-chain composition**. This document is
the whole specification — the algorithm is public and reproducible, not a black box
(`NFFC_Development_Plan.md` v3.2 TASK-12; `docs/spec/08-security-principles.md` A8). Reference
implementation: `domain/art/art.ts` (`renderNffcArt`). Established in TASK-12.

## Inputs — nothing but chain state

| | Source |
|---|---|
| `components[]` — `{ assetId, weightBps }` in order | `NFFC.getComposition(tokenId)` |
| `seed` — a 0x-hex string | `NFFC.getCompositionHash(tokenId)` |

`getComposition` returns the components in their stored (mint) order; `weightBps` sums to 10 000 and
every weight is `> 0` (on-chain invariants I1–I4). The art function rejects anything else
(`InvalidArtCompositionError`).

## Step 1 — PRNG

Two well-known small functions, exact source in `domain/art/art.ts`, identical on every JS engine:

- `xmur3(string) → () => uint32` — hashes a string into a 32-bit state generator.
- `sfc32(a, b, c, d) → () => [0,1)` — a fast counter RNG over four 32-bit words.
- `makeRng(s) = sfc32(xmur3(s)(), xmur3(s)(), xmur3(s)(), xmur3(s)())` — note `xmur3(s)` is called
  once and its generator pulled four times.

Streams used:

| stream | seeded with | drives |
|---|---|---|
| global | `seed` (or `"0x0"` if empty) | rotation, inner radius, outer band, seam width |
| per component `i` | `` `${seed}|${assetId}|${i}` `` | that component's colour index and radial jitter |

Because each component's look depends only on `(seed, assetId, position)`, reordering or swapping an
asset changes that component's stream.

## Step 2 — global parameters

With `R = 500` (half of the `1000×1000` viewBox) and `g = global RNG`:

```
rotationDeg  = round2( g() * 360 )
innerRadius  = round2( R * (0.14 + g() * 0.16) )      // 0.14R … 0.30R
bandOuter    =        R * (0.82 + g() * 0.12)          // 0.82R … 0.94R  (not exported)
gapDeg       = round2( 0.6 + g() * 1.8 )               // angular seam between arcs
```

`round2(x) = Math.round((x + Number.EPSILON) * 100) / 100`, with `-0` normalised to `0`.

## Step 3 — one arc per component

Walking the components in order, keeping a running `cursorDeg` (starts at 0):

```
frac      = weightBps / 10000
spanDeg   = frac * 360
startDeg  = round2( cursorDeg + gapDeg / 2 )
endDeg    = round2( cursorDeg + spanDeg - gapDeg / 2 )
cursorDeg = cursorDeg + spanDeg

c = per-component RNG
colorIndex = floor( c() * 8 );  if colorIndex == previousColorIndex: colorIndex = (colorIndex + 1) % 8
color      = NFFC_ART_PALETTE[colorIndex]

innerR = round2( innerRadius + c() * (R * 0.05) )
reach  = (bandOuter - innerRadius) * (0.35 + 0.65 * frac)      // heavier ⇒ longer
outerR = round2( innerR + reach + c() * (R * 0.04) )
nodeR  = round2( 4 + sqrt(frac) * (R * 0.10) )
```

So the **arc angle is the weight**, the **radial reach and node size grow with the weight**, and the
**colour + jitter come from the asset id**. Any change to a weight, an asset, the order, or the seed
changes at least one arc — two distinct compositions never render the same SVG.

### Palette

`NFFC_ART_PALETTE` = the design-system chart ramp `--chart-1..8` (light values) from
`src/app/globals.css` (TASK-03), resolved to hex so a pinned file is self-contained:

```
#2a78d6  #eb6834  #1baf7a  #eda100  #e87ba4  #008300  #4a3aa7  #e34948
```

If `globals.css` `--chart-*` change, update this array and this table together.

## Step 4 — SVG

Fixed `viewBox="0 0 1000 1000"`, centre `(500, 500)`. `polar(cx, cy, r, deg)` uses
`deg - 90` so `0°` points up, angles increase clockwise, all coordinates `round2`-ed.

```
<rect> background (#f9f9f7)
<g rotate(rotationDeg, 500, 500)>
  for each arc:
    <path>   donut segment innerR→outerR, startDeg→endDeg
    <line>   from innerR at the arc midpoint out to the node
    <circle> node of radius nodeR at (outerR + nodeR + 6) along the midpoint
<circle> inner guide ring at innerRadius (stroke #c3c2b7)
```

The donut path: outer arc `startDeg→endDeg` (sweep 1), line to inner `endDeg`, inner arc back to
`startDeg` (sweep 0), close; large-arc flag set when `endDeg - startDeg > 180`.

No `assetId` or other free text is ever interpolated into the markup — only palette hex and rounded
numbers — so the string is safe to inject and trivial to diff.

## Reconstructing an NFFC's art

```ts
import { renderNffcArt } from "@domain/art/art";

const components = await nffc.getComposition(tokenId);        // [{ assetId, weightBps }, …]
const seed = await nffc.getCompositionHash(tokenId);          // 0x…
const { svg } = renderNffcArt({ components, seed });          // byte-identical to what was pinned
```

## Where it runs

`renderNffcArt` is a zero-dependency pure function — it runs in a Server Component (the
`/style-guide` samples), a Route Handler, or a worker. TASK-18 calls it at the correct point in the
mint flow and pins the SVG to IPFS/Arweave; the resulting URI goes into the static metadata
`image` field (`docs/metadata-architecture.md`) and `NFFC.staticMetadataURI`. Generation is
independent of the mint transaction, so the wizard can show an intermediate state while it runs
(`docs/spec/07-ux-map.md` §4, TASK-17).
