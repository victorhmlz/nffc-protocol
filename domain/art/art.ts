/**
 * Generative art engine (TASK-12). An NFFC's artwork is a **deterministic pure
 * function of its composition** — the real basis-point weights drive the
 * geometry, not a decorative skin bolted on afterwards
 * (`NFFC_Development_Plan.md` v3.2 TASK-12; `docs/spec/08-security-principles.md`
 * A8; `docs/art-algorithm.md`).
 *
 * Inputs are exactly what an NFFC exposes on-chain: `getComposition(tokenId)`
 * (asset ids + weights, in order) and `getCompositionHash(tokenId)` (the seed).
 * Anyone can call {renderNffcArt} with those and get byte-identical SVG — the
 * algorithm is public and reproducible, no black box.
 *
 * Two different compositions never collide: the arc angles *are* the weights and
 * the per-component colour + jitter derive from the asset id, so a change to any
 * weight, any asset, the order, or the seed changes the output.
 */
import { BPS_TOTAL } from "@domain/nffc/composition";

/**
 * The design-system chart palette — `--chart-1..8` (light values) from
 * `src/app/globals.css` (TASK-03). Art is rendered with resolved hex so a pinned
 * file is self-contained; keep these in sync with `globals.css` (see
 * `docs/art-algorithm.md`).
 */
export const NFFC_ART_PALETTE = [
  "#2a78d6",
  "#eb6834",
  "#1baf7a",
  "#eda100",
  "#e87ba4",
  "#008300",
  "#4a3aa7",
  "#e34948",
] as const;

/** SVG canvas is a square of this side, `viewBox="0 0 1000 1000"`. */
export const ART_VIEWBOX = 1000;

const BACKGROUND = "#f9f9f7"; // --background (light)
const INNER_RING_STROKE = "#c3c2b7"; // --border-strong (light)

export class InvalidArtCompositionError extends Error {
  override name = "InvalidArtCompositionError";
}

/** One position of the composition, as read from `NFFC.getComposition`. */
export interface ArtComponent {
  readonly assetId: string;
  readonly weightBps: number;
}

export interface ArtInput {
  /** Components in on-chain order. */
  readonly components: readonly ArtComponent[];
  /** `NFFC.getCompositionHash(tokenId)` — any stable 0x-hex string. */
  readonly seed: string;
}

export interface ArtArc {
  readonly assetId: string;
  readonly startDeg: number;
  readonly endDeg: number;
  readonly color: string; // a member of NFFC_ART_PALETTE
  readonly innerR: number;
  readonly outerR: number;
  readonly nodeR: number;
}

export interface ArtParams {
  readonly rotationDeg: number;
  readonly innerRadius: number;
  readonly gapDeg: number; // angular seam removed between adjacent arcs
  readonly background: string;
  readonly arcs: readonly ArtArc[];
}

// --------------------------------------------------------- seeded PRNG (pure) ---
// xmur3 (string → 32-bit state) + sfc32 (state → uniform [0,1)). No dependencies;
// identical output on every JS engine. Documented in docs/art-algorithm.md.

function xmur3(str: string): () => number {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return h >>> 0;
  };
}

function sfc32(a: number, b: number, c: number, d: number): () => number {
  return () => {
    a >>>= 0;
    b >>>= 0;
    c >>>= 0;
    d >>>= 0;
    let t = (a + b) | 0;
    a = b ^ (b >>> 9);
    b = (c + (c << 3)) | 0;
    c = (c << 21) | (c >>> 11);
    d = (d + 1) | 0;
    t = (t + d) | 0;
    c = (c + t) | 0;
    return (t >>> 0) / 4294967296;
  };
}

function makeRng(seed: string): () => number {
  const s = xmur3(seed);
  return sfc32(s(), s(), s(), s());
}

// --------------------------------------------------------------------- helpers ---

function round2(n: number): number {
  const r = Math.round((n + Number.EPSILON) * 100) / 100;
  return r === 0 ? 0 : r; // normalise -0
}

function polar(
  cx: number,
  cy: number,
  r: number,
  deg: number,
): readonly [number, number] {
  const rad = ((deg - 90) * Math.PI) / 180;
  return [round2(cx + r * Math.cos(rad)), round2(cy + r * Math.sin(rad))];
}

// ------------------------------------------------------------- param derivation ---

/**
 * The composition → visual-parameter map. Deterministic and total (throws only
 * on a composition the on-chain invariants I1–I8 already forbid).
 */
export function deriveArtParams(input: ArtInput): ArtParams {
  const { components, seed } = input;
  if (components.length === 0) {
    throw new InvalidArtCompositionError("composition has no components");
  }
  const total = components.reduce((a, c) => a + c.weightBps, 0);
  if (total !== BPS_TOTAL) {
    throw new InvalidArtCompositionError(
      `weights sum to ${total}, expected ${BPS_TOTAL}`,
    );
  }
  if (components.some((c) => c.weightBps <= 0)) {
    throw new InvalidArtCompositionError("every weightBps must be > 0");
  }

  const rng = makeRng(seed || "0x0");
  const R = ART_VIEWBOX / 2;

  const rotationDeg = round2(rng() * 360);
  const innerRadius = round2(R * (0.14 + rng() * 0.16)); // 0.14R .. 0.30R
  const bandOuter = R * (0.82 + rng() * 0.12); // 0.82R .. 0.94R
  const gapDeg = round2(0.6 + rng() * 1.8);

  let cursorDeg = 0;
  let prevColor = -1;

  const arcs: ArtArc[] = components.map((c, i) => {
    const frac = c.weightBps / BPS_TOTAL;
    const spanDeg = frac * 360;
    const startDeg = round2(cursorDeg + gapDeg / 2);
    const endDeg = round2(cursorDeg + spanDeg - gapDeg / 2);
    cursorDeg += spanDeg;

    // per-component stream: depends only on (seed, assetId, position)
    const crng = makeRng(`${seed}|${c.assetId}|${i}`);

    let colorIndex = Math.floor(crng() * NFFC_ART_PALETTE.length);
    if (colorIndex === prevColor) {
      colorIndex = (colorIndex + 1) % NFFC_ART_PALETTE.length;
    }
    prevColor = colorIndex;

    const innerR = round2(innerRadius + crng() * (R * 0.05));
    const reach = (bandOuter - innerRadius) * (0.35 + 0.65 * frac); // bigger weight → longer reach
    const outerR = round2(innerR + reach + crng() * (R * 0.04));
    const nodeR = round2(4 + Math.sqrt(frac) * (R * 0.1));

    return {
      assetId: c.assetId,
      startDeg,
      endDeg,
      color: NFFC_ART_PALETTE[colorIndex]!,
      innerR,
      outerR,
      nodeR,
    };
  });

  return { rotationDeg, innerRadius, gapDeg, background: BACKGROUND, arcs };
}

// -------------------------------------------------------------------- rendering ---

function donutSegment(
  c: number,
  innerR: number,
  outerR: number,
  startDeg: number,
  endDeg: number,
): string {
  const [ox1, oy1] = polar(c, c, outerR, startDeg);
  const [ox2, oy2] = polar(c, c, outerR, endDeg);
  const [ix2, iy2] = polar(c, c, innerR, endDeg);
  const [ix1, iy1] = polar(c, c, innerR, startDeg);
  const large = endDeg - startDeg > 180 ? 1 : 0;
  return (
    `M ${ox1} ${oy1} A ${outerR} ${outerR} 0 ${large} 1 ${ox2} ${oy2} ` +
    `L ${ix2} ${iy2} A ${innerR} ${innerR} 0 ${large} 0 ${ix1} ${iy1} Z`
  );
}

/** `ArtParams` → a self-contained, deterministic SVG string. */
export function renderArtSvg(params: ArtParams): string {
  const S = ART_VIEWBOX;
  const c = S / 2;

  const body = params.arcs
    .map((a) => {
      const mid = (a.startDeg + a.endDeg) / 2;
      const [nx, ny] = polar(c, c, a.outerR + a.nodeR + 6, mid);
      const [sx, sy] = polar(c, c, a.innerR, mid);
      return (
        `<path d="${donutSegment(c, a.innerR, a.outerR, a.startDeg, a.endDeg)}" fill="${a.color}"/>` +
        `<line x1="${sx}" y1="${sy}" x2="${nx}" y2="${ny}" stroke="${a.color}" stroke-width="3"/>` +
        `<circle cx="${nx}" cy="${ny}" r="${a.nodeR}" fill="${a.color}"/>`
      );
    })
    .join("");

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${S} ${S}" width="${S}" height="${S}" role="img">` +
    `<rect width="${S}" height="${S}" fill="${params.background}"/>` +
    `<g transform="rotate(${params.rotationDeg} ${c} ${c})">${body}</g>` +
    `<circle cx="${c}" cy="${c}" r="${params.innerRadius}" fill="none" stroke="${INNER_RING_STROKE}" stroke-width="2"/>` +
    `</svg>`
  );
}

/** Composition → `{ params, svg }`. The whole engine in one call. */
export function renderNffcArt(input: ArtInput): {
  readonly params: ArtParams;
  readonly svg: string;
} {
  const params = deriveArtParams(input);
  return { params, svg: renderArtSvg(params) };
}

/** Canonical string form of the parameters — a stable fingerprint for tests and
 *  for the pinning layer's content id. */
export function serializeArtParams(params: ArtParams): string {
  return JSON.stringify(params);
}
