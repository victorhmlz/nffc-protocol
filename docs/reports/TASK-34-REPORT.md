# TASK 34 REPORT

## STATUS

COMPLETED

`pnpm verify` (lint · typecheck · test · build) green — **106 files, 520 tests** (was 105/513;
+1 file, +7 tests). 21 routes, unchanged. `pnpm contracts:test` untouched (no `.sol` touched this
TASK). Live smoke test via `pnpm dev`: `<main>` landmark confirmed present in the served HTML of
`/` and `/market`; the three new token hex values confirmed present in the served CSS.

## OBJECTIVE

"Responsive, navegación por teclado, foco, contraste" (`NFFC_Development_Plan.md` v3.4 TASK-34).
Depends on TASK-03 (design system) and every UI surface built through TASK-33, all merged. No open
issue self-nominated for this TASK; no conditions attached to this authorization.

## CONTEXT NOTED, NOT ACTED ON

The Project Lead mentioned an upcoming (not-yet-defined) TASK to redesign `/market`'s layout close
to OpenSea's, explicitly as context only — not an instruction for this TASK, and explicitly not to
be mixed into it. Per that instruction, every fix in this TASK is expressed via existing design-
system tokens/components rather than layout-specific markup, so it stays valid after that redesign
even though the visuals will likely change. The one place this context directly shaped a decision:
Issue #13 below (missing global navigation) is logged rather than designed now, precisely because
building a nav is the kind of layout/IA decision that redesign will likely reshape.

## METHODOLOGY

- **Contrast**: computed WCAG 2.1 ratios directly from `src/app/globals.css`'s real hex values (not
  eyeballed) for every semantic token pairing an actual component renders.
- **Keyboard / focus**: grepped the whole `src/` tree for known anti-patterns (`onClick` on a non-
  interactive element, `outline-none` overriding the focus ring, custom `tabIndex`/`role="button"`
  hacks) and read every custom interactive widget by hand.
- **Responsive**: checked for hardcoded `min-w-`/oversized `w-[...]` values below the 320px floor,
  and confirmed wide elements stay inside their own `overflow-x-auto`.

## FINDINGS AND FIXES

### Contrast — 4 tokens, all in `src/app/globals.css`

| Token | Before → After | Threshold | Ratio before → after |
|---|---|---|---|
| `--subtle-foreground` (light) | `#898781` → `#6e6c67` | 4.5:1 text | 3.41–3.59 → 4.98–5.24 |
| `--chart-label` (light) | `#898781` → `#6e6c67` | 4.5:1 text | 3.50 → 5.11 |
| `--primary` / `--ring` (light) | `#2a78d6` → `#2569c4` | 4.5:1 text | 4.19–4.42 → 5.11–5.39 |
| `--input` (light) | `#d7d6ce` → `#8c8b86` | 3:1 UI boundary | 1.38–1.44 → 3.24–3.41 |
| `--input` (dark) | `#383835` → `#6a6a65` | 3:1 UI boundary | 1.48–1.65 → 3.20–3.57 |

`--subtle-foreground` (meta/timestamp text, `text-xs`/`text-sm` — never large enough for WCAG's
large-text exception) and `--primary-foreground` on `--primary` (`Button variant="primary"`'s
label, also at `text-xs`/`text-sm`) both genuinely failed AA's 4.5:1. `text-primary` (`variant=
"link"`, `TransactionStatus`'s pending tone) also failed at 4.19. `--input`'s border — the *only*
visual boundary a resting, unfocused `<Input>` has, since its `bg-surface` fill is nearly
indistinguishable from the page background — failed the 3:1 non-text UI-boundary requirement badly
in both themes.

Since `docs/design-system.md`'s own Rule (components reference semantic tokens only, never a raw
hex) already held everywhere, each fix is a **single token value change** that corrects every
consumer at once — no per-component patching needed. `docs/design-system.md`'s color table updated
with a footnote; `tests/design-tokens-contrast.test.ts` (new, 5 tests) reads the real CSS and
asserts these ratios as a permanent regression guard.

**Deliberately not touched**: `--chart-axis`/`--chart-grid` (decorative chart chrome, not consumed
by any component yet — real charts are TASK-10+/later, to be tuned with the `dataviz` skill's
validator when built); `--border`/`--border-strong` (decorative separators / a secondary button's
border, which stays identifiable by text and shape without relying on border contrast — not the
"essential boundary" class WCAG 1.4.11 targets, unlike a blank text input).

### Keyboard / ARIA — 3 real findings, all fixed

1. **`StepAssetSelection`'s Add/Remove buttons shared one accessible name per state** — every row's
   button was just "Add" or "Remove," indistinguishable to a screen-reader user browsing form
   controls. Fixed with a per-row `aria-label`, matching the pattern already used correctly
   elsewhere in this codebase (`OfferRowActions`, `StatusToggleButton`). New test asserts distinct
   names.
2. **The mint flow (`StepMint`/`useMintFlow`) still showed a raw exception message** — the one
   write surface TASK-33's audit missed, since `useMintFlow` predates `useWriteFlow`'s lineage (it
   has an extra `prepareMetadata` step `useWriteFlow` doesn't). Found via an ARIA-consistency angle:
   `StepMint`'s bare `<p role="alert">{error}</p>` lacked the `aria-live="assertive"` pairing
   `ErrorNotice` gives every other error surface. Fixed: `useMintFlow` gained the same `errorCode`
   field `useWriteFlow` has; `StepMint` now renders `<ErrorNotice code={errorCode} />`. New test
   drives a failing simulation to the Mint step and asserts the unified message renders instead of
   the raw one.
3. **No page had a `<main>` landmark** — every route's content sat directly under `<body>`, with no
   structural region a screen reader could jump to (WCAG 2.4.1). Fixed once in the root layout
   (`<main>{children}</main>`), covering all 20 routes without touching any individual page file.

### What was already compliant (confirmed, not rebuilt)

`Field`/`FieldLabel`/`FieldControl` (`aria-describedby`/`aria-invalid` wiring), Radix `Dialog`/
`Select`, `role="status"`/`aria-live="polite"` on every loading state, `role="alert"` elsewhere,
real `<button>`/`<a>`/`<input>`/`<select>` everywhere (zero `onClick`-on-`div` instances found),
`<nav aria-label="Pagination">`, `<form role="search">`, `<fieldset>`/`<legend>` around filter
checkboxes, a global `:focus-visible` rule with no component override, `NffcArt`'s `role="img"`/
`aria-label`, no sub-320px-breaking hardcoded widths, every wide table already `overflow-x-auto`.
This TASK's job was largely confirming TASK-03's own groundwork held, not laying new track.

### Minor: stale doc comment fixed in passing

`NffcCard`'s doc comment still said `/nffc/[tokenId]` "doesn't exist yet, so the link 404s until
TASK-21 lands" — TASK-21 shipped and merged since. Fixed while reading this file during the audit
(same "fix a stale citation only in a file already open for another reason" discipline used all
session, e.g. Issue #12).

## DELIBERATELY NOT BUILT — LOGGED AS `docs/OPEN_ISSUES.md` ISSUE #13

**No global navigation exists between top-level surfaces** (`/market`, `/portfolio`, `/activity`,
`/search`, `/create`, `/`) — each is reachable only by typing its URL or via an in-content link.
Real keyboard-navigation and discoverability gap, but building it is a genuine IA/design decision
(what to include, where it lives, how it looks) — not a mechanical audit fix, and it directly
overlaps the marketplace-redesign context the Project Lead flagged as upcoming. Logged with full
reasoning, not designed now, not silently skipped.

## FILES CREATED

```
docs/accessibility.md
docs/reports/TASK-34-REPORT.md
tests/design-tokens-contrast.test.ts
```

## FILES MODIFIED

```
src/app/globals.css                        4 token fixes, light + dark, with inline rationale
docs/design-system.md                      color table + footnote; TASK-34 doc references
src/app/layout.tsx                         <main> landmark added once, covers every route
src/components/wizard/step-asset-selection.tsx   per-row aria-label on Add/Remove
src/components/wizard/step-mint.tsx        ErrorNotice instead of raw error text
src/components/wizard/create-wizard.tsx    passes errorCode instead of error to StepMint
src/components/wizard/create-wizard.test.tsx  +2 tests (distinct names; unified mint error)
src/lib/wizard/use-mint-flow.ts            + errorCode field, same pattern as useWriteFlow
src/components/market/nffc-card.tsx        stale doc-comment fix (TASK-21 shipped since)
docs/OPEN_ISSUES.md                        + Issue #13 (no global nav)
README.md                                  status paragraph; docs/accessibility.md link
```

No `.sol` file touched. Branch is based on `main` (TASK-00…33) — see PULL REQUEST.

## TESTS

`pnpm test` → **106 files, 520 tests** (+1 file, +7 tests):

```
tests/design-tokens-contrast.test.ts (5) — new
create-wizard.test.tsx +2 — distinct Add/Remove names; unified mint-flow error notice
```

`pnpm contracts:test` → unchanged.

## BUILD

`pnpm build` → unchanged, 21 routes.

## LINT / TYPECHECK

Clean.

## SECURITY

STEP 5 AUDIT (`docs/spec/08-security-principles.md` A2/A5, continuing TASK-33's own audit note):
the mint flow no longer shows raw exception text either — closes the one write surface TASK-33's
sweep missed. No other security-relevant surface touched this TASK.

## PERFORMANCE

Negligible — CSS custom-property value changes and one additional wrapper element; no new renders,
no new network calls.

## KNOWN ISSUES

1. **Issue #13 (no global nav)** — see above, deliberately deferred, not silently skipped.
2. **`--chart-label`/`--chart-axis`/`--chart-grid` fixed/audited for a component that doesn't exist
   yet** — `--chart-label` was fixed alongside `--subtle-foreground` (same role, same value,
   trivial and zero-risk); `--chart-axis`/`--chart-grid` were left for the `dataviz` skill's own
   validator once a real chart is built (TASK-10+/later per `docs/design-system.md` §7).
3. **No dedicated automated tool (axe-core, Lighthouse CI) was wired into the test/build pipeline**
   — this audit was manual (contrast computed precisely from source values; keyboard/ARIA read by
   hand against every custom widget), not tool-assisted. Sufficient for this TASK's scope given how
   few components exist and how consistently they already followed the established patterns, but a
   future TASK could add an automated a11y check to CI to catch regressions going forward — not
   requested by this TASK's acceptance criteria, so not added unilaterally.

## ACCEPTANCE CRITERIA

`NFFC_Development_Plan.md` v3.4 TASK-34 objective (no bulleted acceptance criteria listed for this
TASK — `docs/spec/07-ux-map.md` §8's own text, "keyboard navigation, visible focus, sufficient
contrast, and mobile layouts... validated in TASK-34," is the concrete target):

| Criterion | Status | Evidence |
|---|---|---|
| Responsive (usable from 320px) | Met (confirmed, not newly built) | No hardcoded widths found breaking the floor; every wide table already `overflow-x-auto` |
| Keyboard navigation | Met, with 2 real gaps found and fixed | Ambiguous per-row labels (wizard); raw mint-flow error missing `aria-live` pairing |
| Visible focus | Met (confirmed) | Global `:focus-visible` rule, no component override found |
| Sufficient contrast | Met, with 4 real token failures found and fixed | See table above; now regression-tested |

## PULL REQUEST

Branch `task/TASK-34-accessibility`, based on **`main`** (TASK-00…33).

**PR:** https://github.com/victorhmlz/nffc-protocol/pull/41
**CI:** green — https://github.com/victorhmlz/nffc-protocol/actions/runs/34699403856
(`lint · typecheck · test · build` pass, 2m14s; `solidity · compile · test` pass, 32s)

**Do not merge** — Project Lead reviews and authorizes.

## NEXT TASK

**TASK-35 — UI/UX Polish** (`NFFC_Development_Plan.md` v3.4, depende de TASK-34). Blocked until the
Project Lead merges this PR and authorizes TASK-35.
