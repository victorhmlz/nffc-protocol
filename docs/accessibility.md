# Responsive & Accessibility (TASK-34)

"Responsive, navegación por teclado, foco, contraste" (`NFFC_Development_Plan.md` v3.4 TASK-34).
Depends on TASK-03 (design system) and every UI surface built through TASK-33. `docs/spec/07-ux-
map.md` §8 already stated the target ("keyboard navigation, visible focus, sufficient contrast, and
mobile layouts are acceptance criteria for the design system... and are validated in TASK-34") —
this document is that validation, plus the concrete fixes it produced.

## Methodology

- **Contrast**: computed WCAG 2.1 contrast ratios directly from `src/app/globals.css`'s actual hex
  values (not eyeballed) for every semantic token pairing a component actually renders — text
  needs 4.5:1, non-text UI boundaries (focus rings, form-control borders) need 3:1. Checked both
  themes.
- **Keyboard / focus**: grepped the whole `src/` tree for the known anti-patterns (`onClick` on a
  `<div>`/`<span>`, `outline-none` overriding the global focus ring, `tabIndex` hacks, bare `role=
  "button"` on a non-native element) and read every custom interactive widget
  (`MarketFilters`, `ActivityFilters`, `Pagination`, `SearchBar`, the 7 wizard steps, every admin
  table) to confirm each control is a real `<button>`/`<a>`/`<input>`/`<select>` or a Radix
  primitive, and that per-row actions have a distinct accessible name.
- **Responsive**: checked for hardcoded `min-w-`/oversized `w-[...]` values that would break at
  320px (`docs/design-system.md` §5's floor), and confirmed every wide element (tables) is wrapped
  in its own `overflow-x-auto` rather than the page body scrolling.

## Contrast — 4 tokens fixed, all in `src/app/globals.css`

| Token | Role | Before | After | Threshold | Ratio before → after |
|---|---|---|---|---|---|
| `--subtle-foreground` (light) | Meta/timestamp text | `#898781` | `#6e6c67` | 4.5:1 (text) | 3.41–3.59 → 4.98–5.24 |
| `--chart-label` (light) | Chart axis labels (unconsumed today — see KNOWN ISSUES) | `#898781` | `#6e6c67` | 4.5:1 (text) | 3.50 → 5.11 |
| `--primary` / `--ring` (light) | Brand blue — `Button variant="primary"` bg, `variant="link"` text, focus ring | `#2a78d6` | `#2569c4` | 4.5:1 (text: `primary-foreground` on `primary`, and `text-primary`) | 4.42 / 4.19 → 5.39 / 5.11 |
| `--input` (light) | Form-control border | `#d7d6ce` | `#8c8b86` | 3:1 (non-text UI boundary) | 1.38–1.44 → 3.24–3.41 |
| `--input` (dark) | Form-control border | `#383835` | `#6a6a65` | 3:1 (non-text UI boundary) | 1.48–1.65 → 3.20–3.57 |

Every one of these is a **single-token fix** — since `docs/design-system.md`'s own Rule ("components
reference semantic tokens only... never a raw hex") already held everywhere, changing the token
value fixes every consumer at once (no per-component patch needed). `docs/design-system.md`'s color
table is updated with a footnote pointing here.

`tests/design-tokens-contrast.test.ts` (new) reads the real CSS and asserts these ratios directly —
a regression guard, not a one-time check.

**Deliberately not touched**: `--chart-axis`/`--chart-grid` (structural/decorative chart chrome, not
consumed by any component yet — real charts are still TASK-10+/later per `docs/design-system.md`
§7, and will be tuned together with a real chart palette via the `dataviz` skill's own validator
when one exists); `--border`/`--border-strong` (decorative separators and a secondary button's
border, which is still identifiable by its text/shape without relying on border contrast — not the
"essential UI boundary" class WCAG 1.4.11 targets, unlike a blank `<Input>`).

## Keyboard / ARIA — 3 real findings, all fixed

1. **`StepAssetSelection`'s per-row Add/Remove buttons shared one accessible name.** Every row in
   the create-wizard's asset table rendered a button whose only accessible name was "Add" or
   "Remove" — indistinguishable from every other row's button to a screen-reader user tabbing
   through form controls rather than navigating the table structurally. Fixed with
   `aria-label={`${isSelected ? "Remove" : "Add"} ${asset.assetSymbol}`}`, matching the pattern
   this codebase already uses correctly elsewhere (`OfferRowActions`'s `Cancel offer #1`,
   `StatusToggleButton`'s `Deactivate NVDA`). New test in `create-wizard.test.tsx` asserts each
   row's button now has a distinct name.
2. **The mint flow (`StepMint`/`useMintFlow`) still rendered a raw exception message.**
   `useMintFlow` predates TASK-33's `useWriteFlow` lineage (it does an extra `prepareMetadata` step
   `useWriteFlow` doesn't have, so it was never folded into that refactor) and was the one write
   surface TASK-33's audit missed. Found here because `StepMint`'s `<p role="alert">{error}</p>`
   lacked the `aria-live="assertive"` pairing `ErrorNotice` gives every other error surface — an
   ARIA-consistency gap as much as a content one. Fixed: `useMintFlow` gained the same `errorCode`
   field as `useWriteFlow`; `StepMint` now renders `<ErrorNotice code={errorCode} />`. New test in
   `create-wizard.test.tsx` drives a failing simulation all the way to the Mint step and asserts the
   unified message renders, not the raw one.
3. **No page had a `<main>` landmark.** Every route's content sat directly under `<body>` with no
   structural region a screen reader could jump to (WCAG 2.4.1). Fixed once, in the root layout
   (`src/app/layout.tsx`) — `<main>{children}</main>` — covering every route without touching 20
   individual page files; a page's own `<header>`/`<h1>` nests inside it without conflict. Verified
   live via `pnpm dev` on `/` and `/market`.

## What was already compliant (confirmed, not found wanting)

The codebase's own conventions (`Field`/`FieldLabel`/`FieldControl` wiring `aria-describedby`/
`aria-invalid`; Radix `Dialog`/`Select`; `role="status"`/`aria-live="polite"` on every loading state;
`role="alert"` on every other error surface; real `<button>`/`<a>`/`<input>`/`<select>` everywhere,
zero `onClick`-on-`div` instances; `<nav aria-label="Pagination">`; `<form role="search">`;
`<fieldset>`/`<legend>` around the market/activity filter checkboxes; a global `:focus-visible` rule
with no component overriding it; `NffcArt`'s `role="img"`/`aria-label` on its generated SVG; no
hardcoded widths that would break below 320px; every wide table already wrapped in its own
`overflow-x-auto`) were audited and hold. This TASK's job was largely confirming that groundwork,
not laying new track — TASK-03's own acceptance criteria were sound.

## Deliberately not built here — logged as `docs/OPEN_ISSUES.md` Issue #13

**No global navigation exists between top-level surfaces** (`/market`, `/portfolio`, `/activity`,
`/search`, `/create`, `/`) — each is reachable only by typing its URL directly or via an in-content
link from elsewhere. This is a real keyboard-navigation and discoverability gap, but building it is
a genuine information-architecture/design decision (what to include, where it lives, how it looks),
not a mechanical audit fix — and the Project Lead has already flagged an upcoming marketplace
redesign (OpenSea-like layout, a separate future TASK) that would likely reshape exactly this
surface. Designing a nav now risks not surviving that redesign intact. Logged, not built.

## Testing

`tests/design-tokens-contrast.test.ts` (5 tests, contrast regression guard) · 2 new tests in
`create-wizard.test.tsx` (distinct Add/Remove names; unified mint error). `pnpm test`: 106 files,
520 tests (was 105/513, +1 file/+7 tests).
