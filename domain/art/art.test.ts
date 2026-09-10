import { describe, expect, it } from "vitest";
import { BPS_TOTAL } from "@domain/nffc/composition";
import {
  ART_VIEWBOX,
  InvalidArtCompositionError,
  NFFC_ART_PALETTE,
  deriveArtParams,
  renderArtSvg,
  renderNffcArt,
  serializeArtParams,
  type ArtInput,
} from "@domain/art/art";

const SEED =
  "0x9f8e7d6c5b4a39281706f5e4d3c2b1a0ffeeddccbbaa99887766554433221100";

function input(
  components: readonly { assetId: string; weightBps: number }[],
  seed = SEED,
): ArtInput {
  return { components, seed };
}

const TWO = input([
  { assetId: "0xNVDA", weightBps: 6000 },
  { assetId: "0xBTC", weightBps: 4000 },
]);

const FIVE = input([
  { assetId: "0xA", weightBps: 2000 },
  { assetId: "0xB", weightBps: 3500 },
  { assetId: "0xC", weightBps: 1500 },
  { assetId: "0xD", weightBps: 2500 },
  { assetId: "0xE", weightBps: 500 },
]);

function even(n: number): ArtInput {
  const base = Math.floor(BPS_TOTAL / n);
  const comps = Array.from({ length: n }, (_, i) => ({
    assetId: `0x${i.toString(16)}`,
    weightBps: i === 0 ? base + (BPS_TOTAL - base * n) : base,
  }));
  return input(comps);
}

describe("deriveArtParams / renderNffcArt — determinism", () => {
  it("same input yields byte-identical params and SVG on every call", () => {
    const a = renderNffcArt(TWO);
    const b = renderNffcArt(TWO);
    expect(serializeArtParams(a.params)).toBe(serializeArtParams(b.params));
    expect(a.svg).toBe(b.svg);
  });

  it("reconstructs from just the on-chain composition + hash (a fresh object)", () => {
    const reread = input(
      [
        { assetId: "0xNVDA", weightBps: 6000 },
        { assetId: "0xBTC", weightBps: 4000 },
      ],
      SEED,
    );
    expect(renderNffcArt(reread).svg).toBe(renderNffcArt(TWO).svg);
  });
});

describe("uniqueness — different compositions never collide", () => {
  it("a weight change, an asset change, a reorder, and a seed change each change the SVG", () => {
    const variants: ArtInput[] = [
      TWO,
      input([
        { assetId: "0xNVDA", weightBps: 5999 },
        { assetId: "0xBTC", weightBps: 4001 },
      ]),
      input([
        { assetId: "0xAAPL", weightBps: 6000 },
        { assetId: "0xBTC", weightBps: 4000 },
      ]),
      input([
        { assetId: "0xBTC", weightBps: 4000 },
        { assetId: "0xNVDA", weightBps: 6000 },
      ]),
      input(
        [
          { assetId: "0xNVDA", weightBps: 6000 },
          { assetId: "0xBTC", weightBps: 4000 },
        ],
        "0x0000000000000000000000000000000000000000000000000000000000000001",
      ),
    ];
    const svgs = new Set(variants.map((v) => renderNffcArt(v).svg));
    expect(svgs.size).toBe(variants.length);
  });

  it("100 single-bps weight shifts produce 100 distinct outputs", () => {
    const svgs = new Set<string>();
    for (let w = 1; w <= 100; w++) {
      svgs.add(
        renderNffcArt(
          input([
            { assetId: "0xA", weightBps: w },
            { assetId: "0xB", weightBps: BPS_TOTAL - w },
          ]),
        ).svg,
      );
    }
    expect(svgs.size).toBe(100);
  });
});

describe("weights drive the geometry", () => {
  it("each arc's angular span (+ the seam) is proportional to its weightBps", () => {
    const { params } = renderNffcArt(FIVE);
    params.arcs.forEach((arc, i) => {
      const frac = (arc.endDeg - arc.startDeg + params.gapDeg) / 360;
      expect(frac).toBeCloseTo(FIVE.components[i]!.weightBps / BPS_TOTAL, 4);
    });
  });

  it("arcs are laid out in on-chain order and sweep forward", () => {
    const { params } = renderNffcArt(FIVE);
    expect(params.arcs.map((a) => a.assetId)).toEqual(
      FIVE.components.map((c) => c.assetId),
    );
    for (const a of params.arcs) expect(a.endDeg).toBeGreaterThan(a.startDeg);
  });

  it("a heavier component reaches further out and has a bigger node", () => {
    const { params } = renderNffcArt(FIVE);
    const heavy = params.arcs[1]!; // 3500 bps
    const light = params.arcs[4]!; // 500 bps
    expect(heavy.outerR - heavy.innerR).toBeGreaterThan(
      light.outerR - light.innerR,
    );
    expect(heavy.nodeR).toBeGreaterThan(light.nodeR);
  });
});

describe("palette & output", () => {
  it("every arc colour is a design-system chart palette member", () => {
    for (const src of [TWO, FIVE, even(20)]) {
      for (const a of renderNffcArt(src).params.arcs) {
        expect(NFFC_ART_PALETTE as readonly string[]).toContain(a.color);
      }
    }
  });

  it("renders a valid, finite SVG root at the fixed viewBox for 1 and 20 components", () => {
    for (const src of [even(1), even(20)]) {
      const svg = renderNffcArt(src).svg;
      expect(svg.startsWith("<svg")).toBe(true);
      expect(svg).toContain(`viewBox="0 0 ${ART_VIEWBOX} ${ART_VIEWBOX}"`);
      expect(svg).not.toMatch(/NaN|Infinity|undefined/);
      expect(renderNffcArt(src).params.arcs).toHaveLength(
        src.components.length,
      );
    }
  });
});

describe("rejects a composition the on-chain invariants forbid", () => {
  it("empty", () => {
    expect(() => deriveArtParams(input([]))).toThrow(
      InvalidArtCompositionError,
    );
  });
  it("weights not summing to 10,000", () => {
    expect(() =>
      deriveArtParams(input([{ assetId: "0xA", weightBps: 5000 }])),
    ).toThrow(/sum to 5000/);
  });
  it("a zero / negative weight", () => {
    expect(() =>
      deriveArtParams(
        input([
          { assetId: "0xA", weightBps: 10000 },
          { assetId: "0xB", weightBps: 0 },
        ]),
      ),
    ).toThrow(InvalidArtCompositionError);
  });
});

describe("renderArtSvg is a pure function of ArtParams", () => {
  it("same params → same string", () => {
    const p = deriveArtParams(TWO);
    expect(renderArtSvg(p)).toBe(renderArtSvg(p));
  });
});
