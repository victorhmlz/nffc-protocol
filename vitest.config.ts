import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const r = (p: string) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@": r("./src"),
      "@domain": r("./domain"),
      "@adapters": r("./adapters"),
      "@config": r("./config"),
      "@infra": r("./infra"),
      "@workers": r("./workers"),
      // `server-only` throws on import outside a React Server Component build.
      "server-only": r("./tests/support/noop.ts"),
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    include: [
      "src/**/*.{test,spec}.{ts,tsx}",
      "domain/**/*.{test,spec}.{ts,tsx}",
      "adapters/**/*.{test,spec}.{ts,tsx}",
      "config/**/*.{test,spec}.{ts,tsx}",
      "infra/**/*.{test,spec}.{ts,tsx}",
      "workers/**/*.{test,spec}.{ts,tsx}",
      "tests/**/*.{test,spec}.{ts,tsx}",
    ],
    exclude: ["node_modules/**", ".next/**", "e2e/**"],
  },
});
