# NFFC Design System

TASK-03. The visual foundation: **premium financial terminal + collectible marketplace** —
restrained, high-contrast, data-forward. Explicitly **not** meme-coin / casino: no neon, no gradients
as decoration, no drop-shadow pile-ups, one confident accent.

Tokens live in `src/app/globals.css`. Components in `src/components/ui/`. Live reference:
`/style-guide`.

**Rule:** components reference **semantic tokens only** (`bg-surface`, `text-muted-foreground`,
`border-border`, `text-gain`, …) — never a raw hex, never a Tailwind palette step like `bg-blue-600`.

---

## 1. Color

Two themes, both authored (dark is not an auto-flip). Driven by `data-theme` on `<html>`; `dark:`
utilities respond to it. See §6 for the mechanism.

### Semantic roles

| Token | Light | Dark | Use |
|---|---|---|---|
| `background` | `#f9f9f7` | `#0d0d0d` | Page plane |
| `foreground` | `#0b0b0b` | `#ffffff` | Primary text |
| `surface` | `#ffffff` | `#1a1a19` | Cards, panels, inputs |
| `surface-raised` | `#ffffff` | `#212120` | Dialogs, popovers |
| `muted` | `#f1f1ee` | `#242423` | Fills, row hover, skeletons |
| `muted-foreground` | `#52514e` | `#c3c2b7` | Secondary text |
| `subtle-foreground` | `#898781` | `#898781` | Meta, axis labels, timestamps |
| `border` | `#e1e0d9` | `#2c2c2a` | Hairline dividers, default border |
| `border-strong` | `#c3c2b7` | `#383835` | Emphasised border, secondary button |
| `input` | `#d7d6ce` | `#383835` | Form control border |
| `ring` | `#2a78d6` | `#3987e5` | Focus outline (2px, 2px offset) |
| `primary` | `#2a78d6` | `#3987e5` | Primary action; brand |
| `primary-foreground` | `#ffffff` | `#0b0b0b` | Text on primary |
| `accent` | `#eef4fc` | `#17263b` | Hover wash, quiet highlight |
| `accent-foreground` | `#184f95` | `#cde2fb` | Text on accent |

### Financial deltas

Gain / loss. **Always** paired with an arrow (`ArrowUpRight` / `ArrowDownRight`) and a text value —
never colour alone.

| Token | Light | Dark |
|---|---|---|
| `gain` | `#006300` | `#0ca30c` |
| `loss` | `#d03b3b` | `#e66767` |

### Status (reserved — fixed across themes)

`status-good` `#0ca30c` · `status-warning` `#fab219` · `status-serious` `#ec835a` ·
`status-critical` `#d03b3b`. Never reused for a chart series. Always shipped with an icon **and** a
label (some are sub-3:1 on the light surface by design; the icon + label pairing is the mitigation).

### Chart palette

Adopted from the validated data-viz reference palette (`dataviz` skill,
`references/palette.md`) — brand-neutral, passes CVD + contrast in both modes. Swap for a
brand-tuned set later by re-running `scripts/validate_palette.js` against our surfaces; the swap is
isolated to the `--chart-*` tokens.

| Slot | Light | Dark | Slot | Light | Dark |
|---|---|---|---|---|---|
| `chart-1` blue | `#2a78d6` | `#3987e5` | `chart-5` magenta | `#e87ba4` | `#d55181` |
| `chart-2` orange | `#eb6834` | `#d95926` | `chart-6` green | `#008300` | `#008300` |
| `chart-3` aqua | `#1baf7a` | `#199e70` | `chart-7` violet | `#4a3aa7` | `#9085e9` |
| `chart-4` yellow | `#eda100` | `#c98500` | `chart-8` red | `#e34948` | `#e66767` |

Chart chrome: `chart-surface`, `chart-grid` (hairline), `chart-axis` (baseline), `chart-label`.

**Chart rules** (full charts arrive in TASK-10+; follow the `dataviz` procedure then):

- Assign categorical hues **in the fixed slot order above, never cycled**. A 9th series folds into
  "Other" or small multiples.
- **One y-axis.** Never dual-axis — two measures → two charts or index to a common base.
- Colour follows the entity, not its rank; a filter that drops series does not repaint survivors.
- Sequential = the blue ramp, light→dark. Diverging = blue↔red with a **gray** midpoint.
- Legend present for ≥2 series; ≤4 series are also directly labelled. Identity is never colour-alone.
- Every market number carries a source + timestamp (`docs/spec/07-ux-map.md` §6). `ChartFrame`'s
  `meta` slot is where it goes.
- Grid/axes recessive; marks thin; 2px lines; ≥8px markers.

## 2. Typography

| Family | Token | Face | Use |
|---|---|---|---|
| Sans | `--font-sans` | **Inter** (variable, `next/font`) | All UI text, headings, chart labels |
| Mono | `--font-mono` | **JetBrains Mono** (variable) | Prices, quantities, addresses, hashes, code |

- No serif or display face anywhere.
- **`.tabular`** utility (or `font-mono tabular-nums`) for any figures that must align vertically —
  table number columns, axis ticks, stat rows. Standalone numbers (hero values, single stats) may
  use proportional figures.
- Scale (Tailwind): `text-xs` 12 · `text-sm` 14 (body default) · `text-base` 16 · `text-lg` 18 ·
  `text-2xl` 24 · `text-3xl` 30. Headings `font-semibold tracking-tight`.
- Weights used: 400 (body), 500 (labels, emphasis), 600 (headings). No 700+.

## 3. Spacing, radius, elevation, motion

- **Spacing**: Tailwind's 4px scale. Card padding `p-5`; section gaps `gap-4`/`gap-6`; page gutters
  `px-4 sm:px-6 lg:px-8` (via `<Container>`).
- **Radius**: `--radius-xs` 4 · `sm` 6 · `md` 8 (default control) · `lg` 12 (cards) · `xl` 16.
- **Elevation**: `shadow-xs` resting card · `shadow-sm` raised · `shadow-md` menus · `shadow-lg`
  dialogs. Shadows are soft and near-black; never coloured.
- **Motion**: `--duration-fast` 120ms (hover/press), `--duration-base` 180ms (enter/leave),
  `--ease-out`. Respect `prefers-reduced-motion` (added with real transitions in TASK-30/35).

## 4. Components

`src/components/ui/` — all token-driven, all with `className` passthrough via `cn()`.

| Component | Notes |
|---|---|
| `Button` | `variant`: primary · secondary · outline · ghost · destructive · link. `size`: sm · md · lg · icon. `asChild` (Radix `Slot`) for button-as-link. |
| `Card` + parts | `Card` / `CardHeader` / `CardTitle` / `CardDescription` / `CardContent` / `CardFooter`. |
| `Badge` | `variant`: neutral · primary · outline · gain · loss · warning. |
| `Table` + parts | Semantic `<table>`; wrapped in `overflow-x-auto` — the page body never scrolls sideways. `numeric` prop on `TableHead`/`TableCell` → right-aligned mono tabular. |
| `Input`, `Label`, `Field` | `Field` wires `label` + control + hint/error with `aria-describedby` and `aria-invalid` (render-prop API). |
| `Dialog` + parts | Radix Dialog: focus trap, scroll lock, ESC, `aria-modal`, labelled close — built in. |
| `Sparkline` | Pure SVG trend line, no axes/interaction. `tone` auto-derives gain/loss/muted from the series. |
| `ChartFrame`, `ChartLegendItem` | Shell a real chart mounts into: title, legend row, scroll container, caption + source/timestamp line. |
| `Stat` | KPI: label + value + optional delta (always arrow + text). `aligned` for stat rows. |
| `TransactionStatus` | Presentational view of the wallet state machine (`src/lib/wallet/transaction-state.ts`); icon + label + description, `role="status"` `aria-live="polite"`. |
| `ConnectWalletButton` / `NetworkBanner` | Self-custody wallet connect/disconnect + automatic wrong-network detection with a switch-to-4663 action (TASK-16, `docs/wallet-integration.md`). Client Components — the only ones that touch wagmi. |
| `CreateWizard` (`src/components/wizard/`) | The 7-step `/create` flow — basic info, asset selection (one surface, both providers), weights, I1–I8 validation, exact post-mint art preview, fees before signing, mint (TASK-17, `docs/create-wizard.md`). |
| `Select` | A native `<select>`, styled to match `Input`. First used by the marketplace filter bar. |
| `MarketFilters` / `NffcGrid` / `NffcCard` / `BuyButton` / `Pagination` (`src/components/market/`) | The `/market` explore surface — server-rendered grid + pagination, a Client Component filter bar that drives the URL (`?segment=&minRarity=&regime=&listed=&sort=&page=`), and a Client Component buy affordance reusing `TransactionStatus` (TASK-20, `docs/marketplace-ui.md`). |
| `SegmentBadge` / `GeoEligibilityNotice` | The derived composition segment (`CRYPTO_ONLY` / `STOCK_ONLY` / `MIXED`, from `@domain/nffc/segment`) + the geographic-eligibility disclosure. Presentational — the segment is computed, never chosen (TASK-08; `docs/spec/07-ux-map.md` §6). Copy is legal-reviewed before mainnet (TASK-40). |
| `NffcArt` | The NFFC's generative art — a deterministic pure function of its composition + `compositionHash` (`@domain/art`, palette = `--chart-1..8`). Same composition → byte-identical SVG (TASK-12; `docs/art-algorithm.md`). |
| `ReferenceNavStat` / `PerformanceWindows` / `NffcMarketPanel` | Dynamic market data (TASK-15). Always labelled "Reference NAV"; every value carries oracle `source` + a visible age; explicit loading / stale / unavailable states, never a blank number (`docs/spec/07-ux-map.md` §6). `NffcMarketPanel` composes the two around the exact `NffcMarketSnapshot` shape `/api/nffc/[tokenId]/market` returns. |
| `CompositionTable` | Per-component asset / provider / weight, from on-chain data only — no oracle needed. |
| `StaticRarityStat` | The structural rarity score (TASK-14) as a 0–100 index; explicitly notes it is not market data. |
| `Container` | Page gutter + max width (`max-w-6xl`, or `wide` → `1600px` for dense market views). |
| `Skeleton` | Loading placeholder — every async surface shows this or an explicit error. |

## 5. Responsive

- **Desktop-first**, but every surface is usable from **320px** up.
- Breakpoints (Tailwind defaults): `sm` 640 · `md` 768 · `lg` 1024 · `xl` 1280 · `2xl` 1536.
- Content width via `<Container>`. Wide data views (marketplace grid, big tables) use
  `<Container wide>`.
- **Wide content (tables, charts, code) scrolls inside its own `overflow-x-auto` box** — the page
  body must never scroll horizontally.
- Touch targets ≥ 36px (`size-9`) for interactive controls.
- Keyboard: one visible focus ring everywhere (`:focus-visible`, 2px `ring`, 2px offset). Full
  keyboard/focus/contrast audit is TASK-34.

## 6. Theming mechanism

1. `<html data-theme="light" suppressHydrationWarning>` in the root layout.
2. `ThemeScript` (in `<head>`) runs synchronously before first paint: reads
   `localStorage["nffc-theme"]` (`light` | `dark`), else OS `prefers-color-scheme`, and sets
   `data-theme`. No flash, no hydration mismatch (Next.js "Preventing Flash Before Hydration").
3. `ThemeToggle` (client) cycles light → dark → system, persists the choice, and re-applies in a
   `useLayoutEffect` (covers React's dev Strict-Mode attribute reset).
4. CSS: semantic vars are defined for `:root` / `[data-theme="light"]`, overridden under
   `[data-theme="dark"]`, and again under `@media (prefers-color-scheme: dark)` for the no-choice
   case. `@theme inline` maps them to utilities so classes follow the active theme.

## 7. Out of scope for TASK-03

Enter/leave animations and `prefers-reduced-motion` handling (TASK-30/35); the real chart plots and
their hover/table layers (TASK-10+); Select / Combobox / Tabs / Toast / Tooltip (added when a TASK
needs them); the full accessibility audit (TASK-34); brand-tuned chart palette (optional later swap).
