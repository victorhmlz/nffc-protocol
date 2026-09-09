import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier";

/**
 * Import bans that keep the dependency direction one-way
 * (`docs/conventions.md` §1, TASK-02 acceptance):
 *
 *   src / workers  ──►  adapters  ──►  domain
 *   config         ──►  domain
 *
 * `domain/` depends on nothing but itself; `adapters/` never depends on the
 * web app or on workers.
 */
const bannedFromDomain = [
  {
    group: ["next", "next/*"],
    message: "domain/ is framework-agnostic — no Next.js imports.",
  },
  {
    group: ["react", "react/*", "react-dom", "react-dom/*"],
    message: "domain/ must not import React.",
  },
  {
    group: ["@adapters", "@adapters/*", "**/adapters/**"],
    message:
      "domain/ must not import an adapter — depend on domain/ports/* instead.",
  },
  {
    group: ["@/*", "**/src/**"],
    message: "domain/ must not import from the web app (src/).",
  },
  {
    group: ["@workers", "@workers/*", "**/workers/**"],
    message: "domain/ must not import from workers/.",
  },
  {
    group: ["@config", "@config/*", "**/config/**"],
    message: "domain/ must not import runtime config.",
  },
];

const bannedFromAdapters = [
  {
    group: ["@/*", "**/src/**"],
    message: "adapters/ must not import from the web app (src/).",
  },
  {
    group: ["@workers", "@workers/*", "**/workers/**"],
    message: "adapters/ must not import from workers/.",
  },
  { group: ["next", "next/*"], message: "adapters/ must not import Next.js." },
];

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // TASK-01 acceptance: the linter must flag explicit `any`.
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
    },
  },
  // TASK-02 acceptance: enforce the module boundaries.
  {
    files: ["domain/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": ["error", { patterns: bannedFromDomain }],
    },
  },
  {
    files: ["adapters/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": ["error", { patterns: bannedFromAdapters }],
    },
  },
  // Keep ESLint out of formatting decisions; Prettier owns formatting.
  prettier,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "coverage/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
