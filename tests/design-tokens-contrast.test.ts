import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * TASK-34 contrast audit — a regression guard, not a re-derivation of the
 * design system. Reads the real `globals.css` (the single source of truth
 * for every token, `docs/design-system.md` §1's own rule) and computes WCAG
 * 2.1 contrast ratios against it directly, so a future edit to one of these
 * hex values can't silently reintroduce a contrast failure without a test
 * failing here first.
 *
 * Scope: only the tokens this TASK's audit found and fixed
 * (`--subtle-foreground`, `--input`, `--primary`/`--primary-foreground` in
 * light mode; `--input` in dark mode) plus the two backgrounds each is read
 * against (`--background`, `--surface`). Every other token combination was
 * audited manually (see `docs/reports/TASK-34-REPORT.md`) but already
 * passed before this TASK — not worth pinning here as a permanent test
 * fixture for values nothing in this TASK changed.
 */

const CSS = readFileSync(join(__dirname, "..", "src", "app", "globals.css"), "utf8");

/** Extracts `--name: #hex;` from one already-sliced block of the stylesheet. */
function readVar(block: string, name: string): string {
  const match = block.match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})`));
  if (!match) throw new Error(`--${name} not found in the given CSS block`);
  return match[1]!;
}

/** Slices out one `selector { ... }` block by its opening line, brace-balanced. */
function sliceBlock(css: string, selectorPattern: RegExp): string {
  const start = css.search(selectorPattern);
  if (start === -1) throw new Error(`Selector ${selectorPattern} not found`);
  const openBrace = css.indexOf("{", start);
  let depth = 1;
  let i = openBrace + 1;
  while (depth > 0 && i < css.length) {
    if (css[i] === "{") depth++;
    else if (css[i] === "}") depth--;
    i++;
  }
  return css.slice(openBrace + 1, i - 1);
}

const lightBlock = sliceBlock(CSS, /:root,\s*\n?\s*:root\[data-theme="light"\]\s*{/);
const darkBlock = sliceBlock(CSS, /:root\[data-theme="dark"\]\s*{/);

function hexToRgb(hex: string): [number, number, number] {
  const n = hex.replace("#", "");
  return [0, 2, 4].map((i) => parseInt(n.slice(i, i + 2), 16)) as [number, number, number];
}

function relativeLuminance([r, g, b]: [number, number, number]): number {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  }) as [number, number, number];
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/** WCAG 2.1 contrast ratio, 1:1 to 21:1, symmetric in its two arguments. */
function contrastRatio(hexA: string, hexB: string): number {
  const lA = relativeLuminance(hexToRgb(hexA));
  const lB = relativeLuminance(hexToRgb(hexB));
  const [lighter, darker] = lA > lB ? [lA, lB] : [lB, lA];
  return (lighter + 0.05) / (darker + 0.05);
}

const AA_NORMAL_TEXT = 4.5;
const AA_UI_BOUNDARY = 3.0;

describe("design tokens — WCAG contrast (TASK-34)", () => {
  describe("light theme", () => {
    const background = readVar(lightBlock, "background");
    const surface = readVar(lightBlock, "surface");
    const subtleForeground = readVar(lightBlock, "subtle-foreground");
    const input = readVar(lightBlock, "input");
    const primary = readVar(lightBlock, "primary");
    const primaryForeground = readVar(lightBlock, "primary-foreground");

    it("--subtle-foreground meets 4.5:1 (normal text) on both background and surface", () => {
      expect(contrastRatio(subtleForeground, background)).toBeGreaterThanOrEqual(AA_NORMAL_TEXT);
      expect(contrastRatio(subtleForeground, surface)).toBeGreaterThanOrEqual(AA_NORMAL_TEXT);
    });

    it("--primary-foreground on --primary meets 4.5:1 (Button variant=primary's text)", () => {
      expect(contrastRatio(primaryForeground, primary)).toBeGreaterThanOrEqual(AA_NORMAL_TEXT);
    });

    it("--primary as text meets 4.5:1 on background (Button variant=link, TransactionStatus pending)", () => {
      expect(contrastRatio(primary, background)).toBeGreaterThanOrEqual(AA_NORMAL_TEXT);
    });

    it("--input meets 3:1 (non-text UI boundary) on both background and surface", () => {
      expect(contrastRatio(input, background)).toBeGreaterThanOrEqual(AA_UI_BOUNDARY);
      expect(contrastRatio(input, surface)).toBeGreaterThanOrEqual(AA_UI_BOUNDARY);
    });
  });

  describe("dark theme", () => {
    const background = readVar(darkBlock, "background");
    const surface = readVar(darkBlock, "surface");
    const input = readVar(darkBlock, "input");

    it("--input meets 3:1 (non-text UI boundary) on both background and surface", () => {
      expect(contrastRatio(input, background)).toBeGreaterThanOrEqual(AA_UI_BOUNDARY);
      expect(contrastRatio(input, surface)).toBeGreaterThanOrEqual(AA_UI_BOUNDARY);
    });
  });
});
