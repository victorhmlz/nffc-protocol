import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * TASK-35 — `docs/design-system.md` §3 deferred `prefers-reduced-motion`
 * handling to "TASK-30/35"; TASK-30 never touched a TypeScript/CSS file, so
 * it landed here. Regression guard: a future edit that removes the global
 * kill switch (`globals.css`) fails this test rather than silently
 * regressing motion accessibility.
 */
const CSS = readFileSync(join(__dirname, "..", "src", "app", "globals.css"), "utf8");

describe("prefers-reduced-motion (TASK-35)", () => {
  it("has a global media query neutralizing animation/transition duration", () => {
    const match = CSS.match(/@media \(prefers-reduced-motion:\s*reduce\)\s*{([^}]*}[^}]*)}/);
    expect(match).not.toBeNull();
    const block = match![1]!;
    expect(block).toMatch(/animation-duration:\s*0\.01ms\s*!important/);
    expect(block).toMatch(/transition-duration:\s*0\.01ms\s*!important/);
    expect(block).toMatch(/animation-iteration-count:\s*1\s*!important/);
  });
});
