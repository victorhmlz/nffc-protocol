import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier";

/**
 * Import bans that keep the dependency direction one-way
 * (`docs/conventions.md` §1):
 *
 *   src / workers  ──►  adapters ──►  domain
 *   src / workers  ──►  infra    ──►  domain
 *   config         ──►  domain
 *
 * `domain/` depends on nothing but itself. `adapters/` and `infra/` never
 * depend on the web app or on workers.
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
    group: ["@infra", "@infra/*", "**/infra/**"],
    message: "domain/ must not import infrastructure — depend on a port.",
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

const bannedFromInfra = [
  {
    group: ["@/*", "**/src/**"],
    message: "infra/ must not import from the web app (src/).",
  },
  {
    group: ["@workers", "@workers/*", "**/workers/**"],
    message: "infra/ must not import from workers/.",
  },
  {
    group: ["@adapters", "@adapters/*", "**/adapters/**"],
    message: "infra/ must not import an adapter.",
  },
  { group: ["next", "next/*"], message: "infra/ must not import Next.js." },
];

const bannedFromWorkers = [
  {
    group: ["@/*", "**/src/**"],
    message: "workers/ must not import from the web app (src/).",
  },
  { group: ["next", "next/*"], message: "workers/ must not import Next.js." },
  {
    group: ["react", "react/*", "react-dom", "react-dom/*"],
    message: "workers/ must not import React.",
  },
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
  // Module boundaries (TASK-02, extended in TASK-04).
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
  {
    files: ["infra/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": ["error", { patterns: bannedFromInfra }],
    },
  },
  {
    files: ["workers/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": ["error", { patterns: bannedFromWorkers }],
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
    "db/migrate.mjs",
    // Solidity project — its own toolchain (Hardhat, solc); not ESLint's.
    "artifacts/**",
    "cache/**",
    "contracts/**",
    "hardhat.config.ts",
  ]),
]);

export default eslintConfig;
