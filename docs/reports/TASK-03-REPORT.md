# TASK 03 REPORT

## STATUS

COMPLETED

Local gate `pnpm verify` (lint · typecheck · test · build) is green, and the GitHub Actions CI run
on PR #4 passed — all steps in ~38s. See the PULL REQUEST section.

## OBJECTIVE

Build the visual foundation — **premium financial terminal + collectible marketplace**, explicitly
not meme-coin/casino: design tokens (color, typography, spacing) in light and dark; base components
(cards, tables, badges, charts, buttons, forms, modals, wallet states); responsive rules; a written
palette and typography spec (`NFFC_Development_Plan.md` v3.2 TASK-03; `docs/spec/07-ux-map.md`).

## CHANGES

- **Design tokens** (`src/app/globals.css`, Tailwind v4 CSS-first): a static `@theme` layer
  (fonts, radius, shadow, motion) and a **themeable semantic layer** (`--background`, `--surface`,
  `--muted-foreground`, `--border`, `--primary`, `--gain`/`--loss`, status, chart) authored for
  **both** `[data-theme="light"]` and `[data-theme="dark"]`, plus a `@media (prefers-color-scheme:
  dark)` fallback for the no-choice case. `@theme inline` maps semantics → Tailwind utilities so
  classes follow the active theme. Components reference **only** these tokens.
- **Chart palette** adopted from the `dataviz` skill's validated reference palette — brand-neutral,
  passes CVD + contrast in both modes (`node scripts/validate_palette.js` run for light and dark).
  8 fixed categorical slots + sequential (blue) + diverging (blue↔red) + reserved status. Charts'
  rules (fixed slot order, one axis, legend+label, source/timestamp) are written into
  `docs/design-system.md`; the plots themselves follow the `dataviz` procedure in TASK-10+.
- **Typography**: Inter (UI) + JetBrains Mono (figures/addresses/code), both variable, via
  `next/font/google` with CSS-variable output wired to `--font-sans` / `--font-mono`. `.tabular`
  utility for column-aligned figures.
- **Theming mechanism** (no dependency — Next.js "Preventing Flash Before Hydration" pattern):
  `ThemeScript` in `<head>` sets `data-theme` before first paint; `src/lib/theme.ts` is a small
  external store; `ThemeToggle` reads it with `useSyncExternalStore` (no effect-driven setState) and
  cycles light → dark → system.
- **Base components** (`src/components/ui/`, all token-driven, `cn()` merge, `className`
  passthrough):
  - `Button` (6 variants × 4 sizes, `asChild` via Radix `Slot`)
  - `Card` (+ Header/Title/Description/Content/Footer)
  - `Badge` (6 variants)
  - `Table` (+ parts; wrapped in `overflow-x-auto`; `numeric` → right-aligned mono tabular)
  - `Input`, `Label`, `Field` (+ `FieldControl`/`FieldHint`/`FieldError` — compositional, wires
    `htmlFor`/`id`/`aria-describedby`/`aria-invalid`; RSC-safe)
  - `Dialog` (+ parts) — Radix Dialog: focus trap, scroll lock, ESC, `aria-modal`, labelled close
  - `Sparkline` (pure SVG, 2px stroke, 8px end marker, auto gain/loss tone), `ChartFrame` +
    `ChartLegendItem` (the shell real charts mount into)
  - `Stat` (KPI; delta always arrow + text), `TransactionStatus` (presentational view of the wallet
    state machine; `role="status"`, icon + label, never colour-alone)
  - `Container`, `Skeleton`
- **`src/lib/wallet/transaction-state.ts`** — the `TransactionState` union + `TRANSACTION_STATE_META`
  + `isTerminal`, matching `docs/spec/07-ux-map.md` §3. UI-layer vocabulary; the machine's
  transitions are TASK-16.
- **`/style-guide`** — a Server-Component gallery rendering every token and component in all
  variants; living documentation and a build-time exercise of the whole system.
- `src/app/layout.tsx` wires fonts + `ThemeScript`; `src/app/page.tsx` rebuilt on the design system.
- `vitest.setup.ts` — `matchMedia` stub for jsdom (components read the OS colour scheme).
- **`docs/design-system.md`** — the written spec: principles, full colour tables (light + dark),
  chart palette + rules, typography, spacing/radius/elevation/motion, component inventory,
  responsive rules, the theming mechanism, and what is out of scope.
- 6 runtime deps added: `class-variance-authority`, `clsx`, `tailwind-merge`, `lucide-react`,
  `@radix-ui/react-dialog`, `@radix-ui/react-slot`.

## FILES CREATED

```
docs/design-system.md
docs/reports/TASK-03-REPORT.md
src/app/style-guide/page.tsx
src/lib/cn.ts
src/lib/cn.test.ts
src/lib/theme.ts
src/lib/wallet/transaction-state.ts
src/lib/wallet/transaction-state.test.ts
src/components/theme/theme-script.tsx
src/components/theme/theme-toggle.tsx
src/components/ui/badge.tsx
src/components/ui/button.tsx
src/components/ui/button.test.tsx
src/components/ui/card.tsx
src/components/ui/chart-frame.tsx
src/components/ui/container.tsx
src/components/ui/dialog.tsx
src/components/ui/field.tsx
src/components/ui/field.test.tsx
src/components/ui/index.ts
src/components/ui/input.tsx
src/components/ui/label.tsx
src/components/ui/skeleton.tsx
src/components/ui/sparkline.tsx
src/components/ui/stat.tsx
src/components/ui/table.tsx
src/components/ui/transaction-status.tsx
src/components/ui/transaction-status.test.tsx
```

## FILES MODIFIED

```
README.md            status, layout, design-system link
package.json         6 UI runtime deps
pnpm-lock.yaml       lockfile
src/app/globals.css  full token system (was: bare @import "tailwindcss")
src/app/layout.tsx   next/font (Inter + JetBrains Mono) + ThemeScript
src/app/page.tsx     rebuilt on the design system
vitest.setup.ts      jsdom matchMedia stub
```

Branch is based on `task/TASK-02-architecture-foundation` (stacked — see PULL REQUEST).

## TESTS

`pnpm test` → Vitest, **9 files, 19 tests, all pass**. New for TASK-03:

```
✓ src/lib/cn.test.ts (2)                       join + Tailwind conflict resolution
✓ src/lib/wallet/transaction-state.test.ts (3) metadata complete; only success/failed/rejected terminal
✓ src/components/ui/button.test.tsx (3)        default type; variant/size classes; asChild → <a>
✓ src/components/ui/field.test.tsx (2)         label↔control wiring; aria-describedby/aria-invalid on error
✓ src/components/ui/transaction-status.test.tsx (2)  polite live status; label present (not colour-alone)
```

## BUILD

`pnpm build` → Next.js 16.3.4 (Turbopack): compiled, TypeScript checked, 4 routes prerendered:

```
┌ ○ /                  (Static)
├ ○ /_not-found        (Static)
├ ƒ /api/health        (Dynamic)
└ ○ /style-guide       (Static)   ← whole design system, prerendered without error
```

`next/font/google` self-hosted Inter + JetBrains Mono at build time.

## LINT / TYPECHECK

- `pnpm lint` → ESLint 9, clean. The `react-hooks/set-state-in-effect` rule flagged an earlier
  effect-driven `setChoice` in `ThemeToggle`; resolved by moving to `useSyncExternalStore` (the
  correct primitive for reflecting `localStorage`/`matchMedia`), not by disabling the rule.
- `pnpm typecheck` → `next typegen` + `tsc --noEmit` (`strict` + `noUncheckedIndexedAccess`). Clean.
  One fix: `ChartFrame` props use `Omit<ComponentProps<"figure">, "title">` so a `ReactNode` title
  doesn't clash with the native `title` attribute.
- `pnpm format:check` (source) clean.

## SECURITY

STEP 5 AUDIT for a UI-foundation TASK:

- **No hardcoded design values in components** — every component styles via semantic token
  utilities (`bg-surface`, `text-gain`, …). The only literals are `bg-black/50` (modal scrim, a
  Tailwind colour token) and `var(--chart-N)` referenced by inline `style` in `Sparkline` /
  `ChartLegendItem` (that *is* the token). TASK-03 acceptance criterion met.
- **Accessibility baseline** (full audit is TASK-34): one visible `:focus-visible` ring everywhere;
  `Dialog` inherits Radix's focus trap / `aria-modal` / ESC / scroll-lock; `Field` wires
  `aria-describedby` + `aria-invalid`; `TransactionStatus` is `role="status" aria-live="polite"`
  with icon **and** text; status/delta colour is never the sole signal (arrow + label always
  present) — this satisfies the `dataviz` status rule.
- **No FOUC, no hydration error** from theming — the inline `<head>` script sets `data-theme`
  before paint; `<html suppressHydrationWarning>`; `useSyncExternalStore` reconciles the toggle's
  own state on the client without a hydration warning.
- **Chart palette validated by script**, not by eye — `scripts/validate_palette.js` PASS for both
  `--mode light` (surface `#fcfcfb`) and `--mode dark` (surface `#1a1a19`).
- New dependencies are mainstream, React-19-compatible, no native bindings: `class-variance-
  authority`, `clsx`, `tailwind-merge`, `lucide-react`, `@radix-ui/react-dialog` + `react-slot`.
  `pnpm` reported the lockfile passes supply-chain policies.
- No secrets, addresses, or `.env` content added.
- `ThemeScript` uses `dangerouslySetInnerHTML` for the pre-paint inline script — the documented
  Next.js pattern. Note for TASK-32: a strict CSP without `'unsafe-inline'` will need a nonce for
  this script (recorded here, not a blocker now).

## PERFORMANCE

Not a perf TASK (that is TASK-38). Relevant choices: variable fonts, self-hosted via `next/font`
(no layout shift, no third-party request); tokens are CSS variables (theme switch is a single
attribute change, no re-render of the tree); `Sparkline` is dependency-free SVG; no charting
library pulled in yet. `/style-guide` prerenders static.

## KNOWN ISSUES

1. **Enter/leave animations and `prefers-reduced-motion`** are not implemented — `Dialog` and
   `Skeleton` transitions are minimal/static. Motion polish is TASK-30/35. (`tailwindcss-animate` /
   `tw-animate-css` was deliberately not added.)
2. **No visual/screenshot review performed** in this session (no browser automation run). The
   design system builds, prerenders `/style-guide` without error, the palette is script-validated,
   and components are unit-tested, but a human look at `/style-guide` (`pnpm dev`) in both themes is
   worth doing at review and is on the TASK-30/35 polish list.
3. **Component set is intentionally minimal.** Select / Combobox / Tabs / Tooltip / Toast /
   Popover / DropdownMenu are **not** included — they are added by the TASK that first needs them
   (e.g. the create wizard, TASK-12/17), so the foundation isn't padded with unused primitives
   (`NFFC_Claude_Master_Prompt.md` v2.1 Rule 6).
4. **Chart palette is the brand-neutral `dataviz` default.** A brand-tuned palette can replace the
   `--chart-*` tokens later by re-running the validator against our surfaces; the swap is isolated.
5. Carried from TASK-01/02: local Node 22.8.0 and the `vite@6` / `jsdom@25` `pnpm-workspace.yaml`
   overrides — unchanged.

## ACCEPTANCE CRITERIA

`NFFC_Development_Plan.md` v3.2 TASK-03:

| Criterion | Status | Evidence |
|---|---|---|
| Visual tokens (color, typography, spacing) in light **and** dark | Met | `src/app/globals.css` — both `[data-theme]` blocks + OS fallback; `docs/design-system.md` §1–3 |
| Base components: cards, tables, badges, charts, buttons, forms, modals, wallet states | Met | `Card`, `Table`, `Badge`, `Sparkline`+`ChartFrame`, `Button`, `Field`/`Input`/`Label`, `Dialog`, `TransactionStatus` — all in `/style-guide` |
| Responsive rules | Met | `docs/design-system.md` §5; `Container`; `overflow-x-auto` on `Table`/`ChartFrame`; touch targets ≥ 36px |
| Reusable token system, no hardcoded values in components | Met | components use semantic token utilities only; §SECURITY |
| Palette and typography defined in writing | Met | `docs/design-system.md` §1 (full hex tables, both themes) and §2 (Inter + JetBrains Mono, scale, weights, tabular rule) |
| Aesthetic: financial terminal + collectible marketplace, not meme-coin/casino | Met | restrained neutral-forward palette, one accent, soft near-black shadows, no gradients/neon; `docs/design-system.md` intro |

## PULL REQUEST

Branch `task/TASK-03-design-system`, based on **`task/TASK-02-architecture-foundation`** (stacked;
TASK-01 → TASK-02 → TASK-03 not yet merged).

**PR: https://github.com/victorhmlz/nffc-protocol/pull/4** — base `task/TASK-02-architecture-foundation`.
**CI: https://github.com/victorhmlz/nffc-protocol/actions/runs/34407826725 — success** (install ·
lint · typecheck · test · build, ~38s).

Rebase onto `main` and retarget the base as the parent PRs merge. **Do not merge** — Project Lead
reviews and authorizes. Merge order: PR #1 → #2 → #3 → this PR.

## NEXT TASK

**TASK-04 — Infraestructura** (`NFFC_Development_Plan.md` v3.2): environment management
(dev/staging/prod), a multi-provider RPC abstraction to Robinhood Chain (4663), PostgreSQL + Redis
connections, structured logging + error boundaries, and test infrastructure (unit / integration /
contract). Depends on TASK-02. Blocked until the Project Lead merges this PR and authorizes TASK-04.
