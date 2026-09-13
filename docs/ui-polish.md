# UI/UX Polish (TASK-35)

"Eliminar inconsistencias visuales y de interacción acumuladas" (`NFFC_Development_Plan.md` v3.4
TASK-35). Depends on TASK-34, merged.

## The global site header — `docs/OPEN_ISSUES.md` former Issue #13

**Finding:** three wallet-related widgets were each reachable from only one or two of this
project's 12 real routes:

| Widget | Reachable from | Missing on |
|---|---|---|
| `ThemeToggle` | `/`, `/style-guide` | `/market`, `/portfolio`, `/activity`, `/search`, `/create`, `/nffc/[tokenId]`, `/profile/[address]`, `/admin/*` |
| `ConnectWalletButton` | `/portfolio`, `/style-guide` | Everywhere else, including `/market` (where `BuyButton` needs a connected wallet) and `/create` (where minting does) |
| `NetworkBanner` | `/portfolio`, `/style-guide` | Everywhere else — a user on the wrong network trying to buy or mint got no warning at all |

And no route linked to any other at all (`AdminNav`, TASK-31, is the only real nav in the project,
scoped to `/admin/*`) — every top-level surface was reachable only by typing its URL directly.

**Fix:** `SiteHeader` (`src/components/layout/site-header.tsx`), rendered once in the root layout,
above `<main>`. A plain Server Component — the only Client leaves are `NavLink` (new, just
`usePathname()` for `aria-current="page"`) and the three widgets themselves, all already
established Client Components from earlier TASKs (`docs/conventions.md` §2: "Keep `use client` at
the leaves"). Deliberately plain: flex-wrap links, no mobile hamburger drawer, no new visual
language — the Project Lead has flagged an upcoming marketplace-layout redesign (OpenSea-like,
separate future TASK) as context for this TASK, so this stays a minimal, token-only shell rather
than new layout design that redesign might not survive.

Two now-redundant page-local widgets removed: `/` no longer carries its own `<ThemeToggle>`
(duplicate of the header's); `/portfolio` no longer renders a second, already-connected
`<ConnectWalletButton>` above its content (the header already shows connection status
persistently) — the "not connected" contextual CTA inside `/portfolio`'s empty state stays, since
that's a purposeful in-content prompt, not a duplicate of the header's status widget.

## `prefers-reduced-motion` — deferred from TASK-03, landed here

`docs/design-system.md` §3 explicitly deferred this to "TASK-30/35"; TASK-30 (Fee Engine) never
touched a TypeScript/CSS file, so it never happened until now. Added as one global media query in
`globals.css` — the industry-standard kill switch (near-instant duration, one iteration) rather than
`animation: none`, so a spinner still settles to a static, visible state instead of vanishing.
Covers every current transition/animation in the codebase (`Button`/`Input`/`Select`/`Skeleton`'s
pulse/`TransactionStatus`'s spin/`WizardProgress`'s hover) without listing them individually — any
future one inherits it for free. `tests/reduced-motion.test.ts` guards against a future regression.

## Stale homepage copy

`/`'s copy still read "Foundation only; product surfaces land in later tasks" — true at TASK-01,
false since TASK-20 (`/market`, the first real product surface). Updated the copy and swapped the
CTA buttons from "Design system"/"Health" (a documentation page and a JSON API endpoint — reasonable
placeholders for a bootstrap page, wrong for a homepage with a real product behind it) to "Explore
the market"/"Create an NFFC", with "Design system" kept as a third, secondary link.

## What was audited and found already consistent

Empty-state visual treatment differs by context on purpose, not by accident: `NffcGrid`/
`NffcSummaryGrid` (replacing a whole grid area with no existing container) use a dashed-border box;
`CollectionsList`/`ExposureBreakdown` (already inside a `Card`) use plain text — adding a second box
inside an existing one would be worse, not more consistent. `Container` padding/gap scales
(`py-10`, `gap-6`/`gap-8`) are already uniform across every top-level page, the variance in gap
tracking real differences in section density, not drift. Button variant usage, hover treatments, and
spacing scales were spot-checked across the market/portfolio/wizard/admin surfaces and found to
already follow `docs/design-system.md`'s own rules consistently — this TASK did not find a
widespread pattern of variant misuse worth a sweep.

## Testing

`nav-link.test.tsx` (2), `site-header.test.tsx` (4), `reduced-motion.test.ts` (1) — new.
`page.test.tsx`/`portfolio/page.test.tsx` unaffected (neither asserted on the removed widgets).
