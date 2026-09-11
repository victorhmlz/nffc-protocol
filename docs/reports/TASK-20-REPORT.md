# TASK 20 REPORT

## STATUS

COMPLETED

`pnpm verify` (lint · typecheck · test · build) green locally — **49 files, 262 tests** (213 → +49;
+21 added during the pre-TASK-21 audit response, see CHANGES "Review fixes"). `pnpm contracts:build`
/ `pnpm contracts:test` unchanged — **172 Solidity tests** (TASK-20 touches no `.sol`). CI on PR #25
re-verified green after the review fixes — see PULL REQUEST for the current run link.

## OBJECTIVE

Explore, search, filter, sort, list, and buy — with transaction feedback — on the marketplace
(`NFFC_Development_Plan.md` v3.2 TASK-20; `docs/spec/07-ux-map.md` §1 "Marketplace / explore").

## SCOPE NOTE

TASK-20 depends on TASK-03, TASK-16, TASK-19 (all merged) but its own entregable also names the
Indexer (TASK-24), which doesn't exist yet. Following the forward-dependency pattern established
since TASK-11: the UI is built against the **exact eventual indexed data contract**
(`domain/marketplace/listings.ts`'s `IndexedNffcSummary`, mirroring `docs/spec/09-data-model.md`'s
`nffc`/`nffc_component`/`listing` tables), with the indexer supplied through one injected function
(`GetMarketplaceListings`), fixture-backed until TASK-24 lands. `Marketplace.sol` (TASK-19) has no
deployed address either (TASK-31) — the Buy flow's simulation honestly rejects, mirroring TASK-18's
mint-flow fixture exactly. Full detail: `docs/marketplace-ui.md`.

## CHANGES

### `domain/marketplace/listings.ts` (new) — the indexed-data contract + reference query

`IndexedNffcSummary` (the per-NFFC shape a real indexed query returns), `MarketplaceQuery` /
`MarketplaceFilter` / `MarketplaceSort`, and `queryListings` — a pure filter → sort → paginate
function that is both the fixture's engine today and the spec/test oracle for the real indexed
query TASK-24 will write. The acceptance criterion (filters over indexed data, never a per-item
on-chain read) is structural here: nothing in this file or its callers imports a chain reader.

### `src/lib/marketplace/` (new)

- `fixture-listings.ts` — five representative NFFCs (every segment, a spread of rarity and
  mint-condition regimes, listed and unlisted) standing in for the indexer.
- `get-listings.ts` — `GetMarketplaceListings`, the one injection point `/market/page.tsx` calls;
  today wraps `queryListings` over the fixture inside `unstable_cache` (`revalidate: 300`) — TASK-24
  replaces the body with a real indexed query, unchanged signature, no caller changes.
- `parse-query.ts` — pure `parseMarketplaceSearchParams`, turning Next's `searchParams` shape into a
  typed `MarketplaceQuery`; unrecognized/malformed values degrade to "no filter" rather than
  throwing.
- `use-buy-flow.ts` — `useBuyFlow`, `useMintFlow`'s shape (TASK-18) minus the metadata-prep step: a
  `simulateBuy`/`buildBuyCall` pre-flight composed outside `transactionFlowReducer` (unmodified),
  so a simulation failure is communicated before a signature is requested.

### `src/components/market/` (new)

`MarketFilters` (Client — segment/rarity/mint-condition/listed-only/sort, all driven by the URL, no
component state of its own), `NffcGrid` + `NffcCard` (Server — art, segment badge, static rarity,
mint-condition regime, price/listing state, links to `/nffc/[tokenId]`), `BuyButton` (Client island
inside each card — fixture `simulateBuy`/`buildBuyCall` are defined locally, since functions can't
cross the server/client RSC boundary as props from the Server Component page), `Pagination`
(Server, plain `<Link>`s).

### `src/components/ui/select.tsx` (new)

A native `<select>` styled like `Input` — the filter bar's first need for one; added to the shared
barrel for reuse by future filter/sort UIs.

### `src/app/market/page.tsx` (new) — the `/market` route

Server Component; reads `searchParams` (a `Promise` in this Next version — `AGENTS.md`'s
"not the Next.js you know" note, verified against `node_modules/next/dist/docs`), parses it,
calls `getMarketplaceListings`, renders filters + grid + pagination. `export const revalidate = 300`
caches the underlying data fetch — see KNOWN ISSUES for why this isn't classic ISR of the route
itself.

### Docs

`docs/marketplace-ui.md` (new) — the forward-dependency pattern applied here, the data flow, the
buy-flow reuse, and a full explanation of the ISR/dynamic-rendering tension. `docs/design-system.md`
— `Select` + market-component rows. `README.md` — status line, doc link.

### Review fixes (audit response, before merge)

The Project Lead's pre-TASK-21 audit of this PR raised two points, both addressed here rather than
in a separate PR since PR #25 hadn't merged yet:

1. **Missing component tests.** `NffcCard`, `NffcGrid`, `MarketFilters`, `Pagination`, and `Select`
   shipped without dedicated tests, breaking TASK-15's precedent (every new component gets a
   `.test.tsx`) — not a deliberate decision, a real gap. Added: `nffc-card.test.tsx` (representative
   render, listed vs. not-listed), `nffc-grid.test.tsx` (the one real branch of logic here — empty
   state vs. a populated grid), `market-filters.test.tsx` (URL query-param string-building for every
   control, order-independent), `pagination.test.tsx` (href-building via `buildHref`, and that a
   disabled edge renders a real disabled `<button>`, not a still-clickable link), `select.test.tsx`
   (representative render).
2. **`GeoEligibilityNotice` (TASK-08) never reached a real product surface.** Verified: `NffcCard`
   (this TASK) and `StepPreview` (TASK-17) both rendered `SegmentBadge` alone — the geographic-
   eligibility disclosure the Whitepaper §14 / TASK-08 acceptance requires "wherever a segment is
   displayed" was reachable only on `/style-guide`, never in an actual flow, since TASK-08 shipped
   it. `/market`'s grid — public, SEO-indexed, potentially many NFFCs at once — made this the most
   visible instance of the gap. Fixed: `GeoEligibilityNotice` is now rendered in both `NffcCard` and
   `StepPreview`, each covered by a test. `docs/reports/TASK-08-REPORT.md` gets a dated correction
   note (the original ACCEPTANCE CRITERIA table is left as-is — it was accurate for TASK-08 in
   isolation) and `docs/spec/08-security-principles.md`'s F2 finding is updated to record that its
   UX-surfacing half is now closed, while the substantive legal review stays **open**, unaffected,
   gated on TASK-40.

## FILES CREATED

```
domain/marketplace/listings.ts
domain/marketplace/listings.test.ts
src/lib/marketplace/fixture-listings.ts
src/lib/marketplace/get-listings.ts
src/lib/marketplace/parse-query.ts
src/lib/marketplace/parse-query.test.ts
src/lib/marketplace/use-buy-flow.ts
src/lib/marketplace/use-buy-flow.test.tsx
src/components/market/buy-button.tsx
src/components/market/buy-button.test.tsx
src/components/market/nffc-card.tsx
src/components/market/nffc-card.test.tsx
src/components/market/nffc-grid.tsx
src/components/market/nffc-grid.test.tsx
src/components/market/market-filters.tsx
src/components/market/market-filters.test.tsx
src/components/market/pagination.tsx
src/components/market/pagination.test.tsx
src/components/ui/select.tsx
src/components/ui/select.test.tsx
src/app/market/page.tsx
docs/marketplace-ui.md
docs/reports/TASK-20-REPORT.md
```

## FILES MODIFIED

```
domain/index.ts                              export marketplace/listings
src/components/ui/index.ts                   export Select
src/components/wizard/step-preview.tsx        + GeoEligibilityNotice (review fix)
src/components/wizard/create-wizard.test.tsx  + geo-disclosure test (review fix)
docs/design-system.md                        Select + market-component rows
docs/OPEN_ISSUES.md                           + Issue #5, + Issue #6; next ID -> 7
docs/reports/TASK-08-REPORT.md                correction note (review fix)
docs/spec/08-security-principles.md           F2 updated (review fix)
README.md                                     status line + doc link
```

Branch is based on `main` (TASK-00…19) — see PULL REQUEST.

## TESTS

`pnpm test` → Vitest, **49 files, 262 tests** (49 new over the TASK-19 baseline):

```
listings.test.ts (13)       filter by segment / min rarity / mint regime / listed-only, combined
                             (AND) filters; sort newest/rarity_desc/price_asc/price_desc (unlisted
                             items always sort after listed ones, either price direction);
                             pagination incl. an out-of-range page and clamped page/pageSize
parse-query.test.ts (11)    defaults; segment/minRarity/regime/listed/sort/page parsing, each with
                             an invalid-input case that degrades to the default rather than throwing;
                             a single (non-array) regime value; rarity clamped into [0, 1]
use-buy-flow.test.tsx (3)   never calls the wallet write when simulateBuy rejects — state stays idle
                             (acceptance, mirrors TASK-18); isSimulating shown then cleared; state
                             leaves idle only after a successful simulation
buy-button.test.tsx (1)     the honest "Marketplace is not deployed yet (TASK-31)" fixture, live —
                             error shown, button never left non-clickable (no wallet flow entered)
```

Added during the review fix (component coverage + the geo-disclosure wiring):

```
nffc-card.test.tsx (4)      representative render — identity/segment/rarity/mint-condition/price and
                             a Buy button when listed; "Not listed" + no Buy button when not; the
                             geo-eligibility disclosure for a restricted and a not-restricted segment
                             (TASK-08 acceptance)
nffc-grid.test.tsx (2)      the one real branch of logic here — empty-state message with no <ul> vs.
                             one <li>/<NffcCard> per item
market-filters.test.tsx (9) every control renders; URL query-param string-building (order-
                             independent) for segment/minRarity/sort — set and clear; regime
                             checkboxes append/remove their own param, preserving the others;
                             listed-only sets/clears `listed=1`; any change resets `page`
pagination.test.tsx (4)     href-building via `buildHref` for Previous/Next, preserving other params;
                             renders nothing when everything fits on one page; a disabled edge is a
                             real disabled <button>, not a still-clickable <a> (the bug that pattern
                             would otherwise hide)
select.test.tsx (1)         representative render — options + the given value selected
create-wizard.test.tsx (+1) StepPreview now also shows the geo-eligibility disclosure alongside the
                             segment badge (TASK-08 acceptance, added to the existing 6 tests)
```

`pnpm contracts:test` → **172 Solidity tests**, unchanged (TASK-20 adds no `.sol`).

## BUILD

`pnpm build` green — **9 routes** now (`/market` added, marked `ƒ` dynamic — see KNOWN ISSUES for
why).

## LINT / TYPECHECK

Clean.

## SECURITY

STEP 5 AUDIT (`docs/spec/08-security-principles.md`):

| Concern | This TASK |
|---|---|
| **Filters operate on indexed data, never a per-item on-chain read** (acceptance) | Structural: `domain/marketplace/listings.ts` and `src/lib/marketplace/get-listings.ts` import nothing from `infra/rpc` or any chain reader — there is no code path back to a per-item on-chain call |
| Public, read-only, SEO/shareable → Server Components (ux-map §2) | `/market/page.tsx`, `NffcGrid`, `NffcCard`, `Pagination` are all Server Components; only `MarketFilters` and `BuyButton` are Client, and only because they touch the URL / wallet respectively |
| Simulation failures surface before a signature is requested (TASK-18 acceptance, reused here) | `useBuyFlow` composes `simulateBuy` outside `transactionFlowReducer`, unmodified; `flow.request(...)` — the only thing that opens the wallet — is reached only after `simulateBuy` resolves without throwing |
| A5 — reads that inform a decision carry provenance | `NffcCard` shows static rarity (structural, no timestamp needed — same rationale as `StaticRarityStat`, TASK-14) and the mint-condition regime frozen at mint; no live/dynamic market data is shown on the card (that's TASK-21's job, over TASK-15's already-provenanced components) |
| No arbitrary address becomes buyable, no premature wallet interaction | `BuyButton`'s fixture always rejects — nothing calls a contract yet; the Buy button is disabled while simulating or mid-flow, so a double-click can't fire a second `request` |
| **Geographic-eligibility disclosure shown wherever a segment is displayed** (TASK-08 acceptance) | Added during review: `NffcCard` renders `GeoEligibilityNotice` alongside `SegmentBadge` — `/market` had been the first public, SEO-indexed, mass-grid surface to show a segment without it; `StepPreview` (TASK-17) got the same fix in the same PR. See CHANGES "Review fixes" and `docs/reports/TASK-08-REPORT.md`'s correction note |

## PERFORMANCE

`queryListings` is `O(n log n)` over the indexed set (filter + sort), trivial at fixture scale;
TASK-24's real implementation is expected to push filtering/sorting/pagination into the SQL query
itself rather than loading every row. The data fetch is `unstable_cache`'d (`revalidate: 300`) so
repeated requests for an identical query don't redo the work.

## KNOWN ISSUES

1. **`/market` is dynamically rendered, not classic ISR**, despite the entregable naming both
   "Server Components" and "ISR". Reading `searchParams` (required for server-side filtering — the
   literal acceptance criterion) opts the route into per-request dynamic rendering under this
   project's caching model (`cacheComponents` not enabled). The route is still fully SSR'd and
   crawlable; only the underlying data fetch is cached (`unstable_cache`), not the HTML shell.
   Logged as `docs/OPEN_ISSUES.md` **Issue #5** — resolving it fully means evaluating
   `cacheComponents` project-wide, out of TASK-20's own scope.
2. **`/` and `/market` are both "Marketplace / explore" per the ux-map, but only `/market` was
   built.** `/` still shows the TASK-01 bootstrap landing page; no redirect or shared content
   exists between them. Logged as `docs/OPEN_ISSUES.md` **Issue #6** — a product decision for the
   Project Lead, not an engineering gap.
3. **Offer creation UI is out of scope**, deliberately. The Entregable's wording ("compra/oferta")
   mentions offers, but the Objetivo's own verb list doesn't ("Explorar, buscar, filtrar, ordenar,
   listar, comprar"), and TASK-29 (Offers) explicitly owns the full create/accept/cancel/expiry
   lifecycle with its own acceptance criteria. Not added to `docs/OPEN_ISSUES.md` — this is scope
   already assigned to a named future TASK, not an unresolved finding.
4. **`NffcCard` links to `/nffc/[tokenId]` (TASK-21), which doesn't exist yet** — a 404 until then.
   Not a regression; the URL contract is exactly the one TASK-21's route will fill in.
5. **No search box.** The Objetivo names "buscar" (search) alongside filter/sort; TASK-20 implements
   filter (segment/rarity/mint-condition) and sort, per the literal acceptance criterion, but not
   free-text search — there is no indexed text field to search yet (collection/creator name search
   is naturally an indexer/TASK-24 concern: it needs a query the fixture can't meaningfully
   represent at 5 rows). A gap worth tracking once TASK-24 exists; not logged as an open issue now
   since it depends entirely on infrastructure that doesn't exist yet.
6. **No live Reference NAV or performance data on the card.** TASK-15's dynamic components
   (`ReferenceNavStat`, `PerformanceWindows`) exist but aren't wired into `NffcCard` — the card shows
   only static, structural facts (rarity, mint condition, segment). Deferred to TASK-21 (NFFC
   Detail), which is where the ux-map places the full dynamic market panel; the card stays
   deliberately light for grid performance at scale.

## ACCEPTANCE CRITERIA

`NFFC_Development_Plan.md` v3.2 TASK-20:

| Criterion | Status | Evidence |
|---|---|---|
| Filters by composition (incl. crypto-only/mixed), rarity, and mint condition work over indexed data, never a per-item on-chain read | Met | `domain/marketplace/listings.ts`'s `queryListings` + `src/lib/marketplace/get-listings.ts` import no chain-reader module — structurally impossible to fall back to a per-item on-chain read; `listings.test.ts` covers every filter individually and combined |

## PULL REQUEST

Branch `task/TASK-20-marketplace-ui`, based on **`main`** (TASK-00…19).

**PR: https://github.com/victorhmlz/nffc-protocol/pull/25** — base `main`.
**CI: https://github.com/victorhmlz/nffc-protocol/actions/runs/34599027083 — success** — both jobs.

**Do not merge** — Project Lead reviews and authorizes.

## NEXT TASK

**TASK-21 — NFFC Detail** (`NFFC_Development_Plan.md` v3.2). Blocked until the Project Lead merges
this PR and authorizes TASK-21.
