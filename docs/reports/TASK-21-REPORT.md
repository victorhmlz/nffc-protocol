# TASK 21 REPORT

## STATUS

COMPLETED

`pnpm verify` (lint · typecheck · test · build) green locally — **58 files, 288 tests** (262 → +26).
`pnpm contracts:build` / `pnpm contracts:test` unchanged — **172 Solidity tests** (TASK-21 touches
no `.sol`). Also smoke-tested live under `pnpm dev` (see BUILD). Both CI jobs on PR #26 pass — run
`34606118551`. See PULL REQUEST.

## OBJECTIVE

The premium NFFC detail page: art, reference value, performance, composition, activity, ownership,
listing, offer — at a stable, indexable, shareable URL with a correct social preview of the
generative art (`NFFC_Development_Plan.md` v3.2 TASK-21; `docs/spec/07-ux-map.md` §5).

## SCOPE NOTE

TASK-21 depends on TASK-15 (dynamic NFFC UI) and TASK-20 (marketplace UI), both merged. Like every
forward-dependent TASK since TASK-11, the page is built against the exact eventual indexed data
contract (`domain/nffc-detail/detail.ts`'s `NffcDetail`, mirroring `docs/spec/09-data-model.md`'s
`nffc`/`listing`/`offer`/`activity` tables) with the indexer (TASK-24) supplied through one injected
function, fixture-backed. The fixture is deliberately derived *from* TASK-20's own
`FIXTURE_LISTINGS`, so `/market` and `/nffc/[tokenId]` agree on the same five tokens rather than
diverging. "Offer" on this page is read-only, for the same reason TASK-20 implemented Buy only:
TASK-29 explicitly owns the full offer lifecycle. Full detail: `docs/nffc-detail.md`.

## CHANGES

### `domain/nffc-detail/detail.ts` (new) — the detail contract

`NffcDetail`, `ActivityEntry`, `OfferSummary` — the indexer's exact eventual per-token read shape.
`NffcDetail.metadata` **is** `StaticNffcMetadata` (TASK-11) reused wholesale, not re-derived: the
page's static facts and the document `verifyStaticMetadataAgainstChain` checks are, by construction,
the same object — the strongest traceability story available for criterion #1.

### `src/lib/nffc-detail/` (new)

- `fixture-detail.ts` — `FIXTURE_DETAILS`, built from TASK-20's `FIXTURE_LISTINGS` via TASK-11's own
  `buildStaticNffcMetadata`, with a synthesized mint-condition trait (shape-correct per
  `toMetadataTrait`'s keys), activity timeline, and one active offer (token `"1"`).
- `get-nffc-detail.ts` — `GetNffcDetail`, the one injection point the page calls; `unstable_cache`'d.
- `get-nffc-market-snapshot.ts` — the same "no price engine yet" `NffcMarketSnapshot`
  `/api/nffc/[tokenId]/market` already returns (TASK-11); factored out so both the route and the
  page call one function, and so `Date.now()` never appears directly in the page's render body
  (`react-hooks/purity` — see LINT / TYPECHECK).

### `src/lib/token-id.ts`, `src/lib/format-eth.ts`, `src/lib/format-address.ts` (new)

Small shared utilities: `isValidTokenId` (now used by both `/api/nffc/[tokenId]/market` and the new
page — previously duplicated only in the API route), `formatEth` (deduplicated out of `NffcCard`,
TASK-20 — that file now imports it instead of defining its own copy), `truncateAddress`.

### `src/components/nffc/` (new) — the remaining detail-page panels

`MintConditionCard` (the frozen, oracle-sourced trait — distinct from `NffcMarketPanel`'s live
data), `OwnershipCard` (owner + creator + the indexed freshness block number), `ListingCard`
(reuses TASK-20's `BuyButton` unchanged), `OffersList` (read-only), `ActivityTimeline` (every entry
carries a block number and transaction hash).

### `src/app/nffc/[tokenId]/page.tsx` (new) — the detail route

Server Component; reads only `params` (no `searchParams`), so — unlike `/market` — there is no
tension between server rendering and ISR here. `export const revalidate = 300`, no
`generateStaticParams`: classic on-demand ISR, verified live (see BUILD). `generateMetadata` sets
title/description; the Open Graph image comes from the colocated file convention below, not manual
`openGraph.images` wiring.

**Note added in review (Project Lead audit, before merge):** the page's header block renders
`SegmentBadge` **and** `GeoEligibilityNotice` (`facts.segment`) directly, immediately below the
title — this was present from this branch's first commit, not a follow-up fix. It's called out here
explicitly because it lives in `page.tsx`'s own layout rather than in one of the five new
`src/components/nffc/` panels, so it wasn't named in this report's original CHANGES pass and could
otherwise read as a gap the way it genuinely was one in `StepPreview` (TASK-17) and `NffcCard`
(TASK-20) before their fixes. `/nffc/[tokenId]` is the most shareable, link-direct surface in the
project — the one most likely to be opened without ever passing through `/market` — so this is not
a minor detail: verified live, not just read in source (`GET /nffc/1` → response body contains the
segment label "Mixed" and the `GeoEligibilityNotice` copy, in one `role="note"` element).

### `src/app/nffc/[tokenId]/opengraph-image.tsx` (new) — the real social-preview image

Uses `next/og`'s `ImageResponse` to rasterize the token's exact SVG art (passed as an `<img src>`
data URI — Satori resolves it) into a 1200×630 PNG at request time. This is the actual fix for the
"correct social preview of the generative art" entregable, not a restatement of TASK-18's known
`data:`-URI-as-`og:image` limitation: it's a real HTTP(S) image URL, no external hosting needed.
Verified live (see BUILD).

### `src/components/market/nffc-card.tsx`, `src/app/api/nffc/[tokenId]/market/route.ts` (modified)

Both updated to import the new shared utilities (`formatEth`, `isValidTokenId`,
`getNffcMarketSnapshot`) instead of their own local copies — no behavior change, confirmed by the
unchanged `market/route.test.ts` still passing.

### Docs

`docs/nffc-detail.md` (new) — the data flow, the traceability table (criterion #1, row by row), the
real-ISR explanation, the social-preview image mechanism, and the offers-are-read-only scope
decision. `docs/design-system.md` — the five new `nffc/` components. `README.md` — status line, doc
link.

## FILES CREATED

```
domain/nffc-detail/detail.ts
src/lib/nffc-detail/fixture-detail.ts
src/lib/nffc-detail/fixture-detail.test.ts
src/lib/nffc-detail/get-nffc-detail.ts
src/lib/nffc-detail/get-nffc-market-snapshot.ts
src/lib/token-id.ts
src/lib/token-id.test.ts
src/lib/format-eth.ts
src/lib/format-eth.test.ts
src/lib/format-address.ts
src/lib/format-address.test.ts
src/components/nffc/mint-condition-card.tsx
src/components/nffc/mint-condition-card.test.tsx
src/components/nffc/ownership-card.tsx
src/components/nffc/ownership-card.test.tsx
src/components/nffc/listing-card.tsx
src/components/nffc/listing-card.test.tsx
src/components/nffc/offers-list.tsx
src/components/nffc/offers-list.test.tsx
src/components/nffc/activity-timeline.tsx
src/components/nffc/activity-timeline.test.tsx
src/app/nffc/[tokenId]/page.tsx
src/app/nffc/[tokenId]/opengraph-image.tsx
docs/nffc-detail.md
docs/reports/TASK-21-REPORT.md
```

## FILES MODIFIED

```
domain/index.ts                             export nffc-detail/detail
src/components/market/nffc-card.tsx         formatEth -> shared src/lib/format-eth.ts
src/app/api/nffc/[tokenId]/market/route.ts  isValidTokenId + getNffcMarketSnapshot -> shared
docs/design-system.md                       5 new nffc/ component rows
README.md                                   status line + doc link
```

Branch is based on `main` (TASK-00…20) — see PULL REQUEST.

## TESTS

`pnpm test` → Vitest, **58 files, 288 tests** (26 new):

```
fixture-detail.test.ts (7)        every FIXTURE_LISTINGS token has a matching NffcDetail; segment/
                                   rarity/listing agree between the two; mint-condition Regime
                                   matches the summary; every activity entry has a block number and
                                   tx hash; always starts with MINT; TRANSFER only when creator !=
                                   owner; exactly one token carries an active offer
token-id.test.ts (2)              accepts positive decimals; rejects zero/negative/leading-zero/non-
                                   numeric input
format-eth.test.ts (4)             whole amount, fractional (trailing zeros trimmed), zero, 3-digit cap
format-address.test.ts (2)        truncates a full address; leaves a short string untouched
mint-condition-card.test.tsx (2)  renders every trait field; explicit "not available" for a null
                                   trait, not a blank card
ownership-card.test.tsx (1)       representative render — owner, creator, freshness block
listing-card.test.tsx (2)         price + seller + Buy button when listed; "Not listed" + no Buy
                                   button when not — the one real branch of logic here
offers-list.test.tsx (3)          empty state (not a blank table); lists an active offer; excludes
                                   inactive offers
activity-timeline.test.tsx (3)    empty state; every field incl. traceability (block, tx hash) for a
                                   populated timeline; no amount shown for a non-value event
```

Following the established precedent (`/create/page.tsx`, `/market/page.tsx` — neither has a
dedicated `page.test.tsx`; only constituent pieces + data-access functions are unit-tested), the new
`page.tsx` and `opengraph-image.tsx` route files are not unit-tested directly — every panel they
compose is, and both routes were verified live instead (see BUILD).

`pnpm contracts:test` → **172 Solidity tests**, unchanged (TASK-21 adds no `.sol`).

## BUILD

`pnpm build` green — **11 routes** now (`/nffc/[tokenId]` and `/nffc/[tokenId]/opengraph-image`
added, both `ƒ`).

Also smoke-tested live under `pnpm dev`, since a Server Component page + a `next/og` image route are
both awkward to unit-test meaningfully:

```
GET /nffc/1               200  (renders: art, composition, listing, ownership, activity, ...)
GET /nffc/999              404  (notFound() — no such token, correct)
GET /nffc/1/opengraph-image  200 image/png  (real rasterized PNG, confirming the Satori path works)
GET /market                200  (unaffected by this TASK's shared-util refactors)
```

Re-verified live during the Project Lead's pre-merge audit (TASK-08 acceptance — see SECURITY):
`GET /nffc/1`'s response body contains the segment label "Mixed" (`SegmentBadge`), the
`GeoEligibilityNotice` copy ("...geographic restriction..."), and exactly one `role="note"` element
— confirming both render together on this page too, not just in source.

## LINT / TYPECHECK

Clean, with one fix along the way: `Date.now()` called directly in `NffcDetailPage`'s render body
tripped `react-hooks/purity` ("Cannot call impure function during render"). Fixed by factoring the
snapshot construction into `getNffcMarketSnapshot` (an `async` data-fetch function the page awaits,
matching the injection-point pattern every other data source on this page already follows) rather
than reaching for a suppression.

## SECURITY

STEP 5 AUDIT (`docs/spec/08-security-principles.md`):

| Concern | This TASK |
|---|---|
| **Every displayed datum traces to an identified on-chain or oracle origin** (acceptance) | See `docs/nffc-detail.md`'s traceability table — each of the ten shown facts is mapped to its exact source; `NffcDetail.metadata` reuses `StaticNffcMetadata` (TASK-11) wholesale rather than re-deriving it, so the page's static facts and what an independent verifier checks are the same object |
| **Renders and is shareable without a connected wallet; wallet only for actions** (acceptance) | Structural: `BuyButton` is the only Client Component reachable from this page (inside `ListingCard`); nothing else imports a wagmi hook — verified by `pnpm build`'s route listing and the live smoke test |
| Public, read-only, SEO/shareable → Server Components (ux-map §2) | The whole page tree is Server Components except `BuyButton`; classic ISR (see CHANGES) makes the URL stable and cacheable, unlike `/market` |
| No premature wallet interaction | `ListingCard` reuses `BuyButton` as-is — same fixture, same `nonReentrant`-adjacent guard against a double request, unchanged from TASK-20 |
| A5 — reads that inform a decision carry provenance | `NffcMarketPanel` (unchanged from TASK-15) carries `source`+`observedAt` or an explicit `unavailableReason`; `MintConditionCard` labels itself "frozen at mint, oracle-sourced, not live market data" so it's never confused with the live panel beside it |
| **Geographic-eligibility disclosure shown wherever a segment is displayed** (TASK-08 acceptance, `docs/reports/TASK-08-REPORT.md`'s correction note) | `page.tsx` renders `SegmentBadge` + `GeoEligibilityNotice` together in the header, since this branch's first commit — not a follow-up fix, but confirmed and made explicit during the Project Lead's pre-merge audit (this page is the most shareable, link-direct surface in the project, the one most likely to be opened without passing through `/market`); verified live, not just read in source |

## PERFORMANCE

The page makes exactly two data calls (`getNffcDetail`, `getNffcMarketSnapshot`), both
`unstable_cache`'d; no loops over on-chain state, no N+1 pattern. The `opengraph-image` route is
static-optimized by default per Next's file-convention semantics (cached like any other route unless
it reads a Request-time API — it reads only `params`, so it is).

## KNOWN ISSUES

1. **Activity/offers data is fixture-only**, standing in for TASK-24's indexer. The fixture is
   derived from TASK-20's own dataset for internal consistency, but the activity entries'
   transaction hashes and block numbers are synthesized, not real. Resolved once TASK-24 exists.
2. **No live Reference NAV / performance data**, honestly — `unavailableReason` is always set until
   TASK-22/23 (Price/NAV Engines) exist. Not a gap in this TASK; `NffcMarketPanel` was built in
   TASK-15 specifically to show this state explicitly rather than a blank number.
3. **Offer creation is out of scope here too**, same reasoning as TASK-20's Buy-only decision:
   TASK-29 explicitly owns the full lifecycle. Not logged as an open issue — scope already assigned
   to a named future TASK.
4. **`page.tsx` and `opengraph-image.tsx` have no dedicated unit test**, following the established
   precedent that route files composing already-tested pieces aren't unit-tested directly
   (`/create/page.tsx`, `/market/page.tsx` — neither has one either). Compensated with a live smoke
   test under `pnpm dev` (see BUILD) rather than skipped silently.
5. **The mint-condition trait's oracle `basis` (the exact rounds used) isn't surfaced on the page**,
   only the flattened `toMetadataTrait()` record (`Regime`, drawdown, etc.). `MintConditionTrait.basis`
   exists in the domain type (TASK-13) but isn't part of `StaticNffcFacts.mintConditionTrait`'s
   flattened shape, so it isn't available to surface without a broader TASK-11 metadata-shape change.
   Not logged as an open issue — the flattened record is still oracle-sourced and traceable in
   principle (criterion #1 is about identifying the origin, not embedding every raw datum), and
   changing `StaticNffcFacts`'s shape is out of this TASK's scope.

## ACCEPTANCE CRITERIA

`NFFC_Development_Plan.md` v3.2 TASK-21:

| Criterion | Status | Evidence |
|---|---|---|
| Every displayed datum is traceable to an identified on-chain or oracle origin | Met | `docs/nffc-detail.md`'s traceability table; `NffcDetail.metadata` reuses `StaticNffcMetadata` (TASK-11) wholesale rather than re-deriving facts |
| The page renders and is shareable without a connected wallet; a wallet is needed only for actions | Met | Structural — `BuyButton` is the only Client Component on the page; verified live (`GET /nffc/1` → 200 with no wallet connected) |

## PULL REQUEST

Branch `task/TASK-21-nffc-detail`, based on **`main`** (TASK-00…20).

**PR: https://github.com/victorhmlz/nffc-protocol/pull/26** — base `main`.
**CI: https://github.com/victorhmlz/nffc-protocol/actions/runs/34606118551 — success** — both jobs.

**Do not merge** — Project Lead reviews and authorizes.

## NEXT TASK

**TASK-22 — Price Engine** (`NFFC_Development_Plan.md` v3.2). Blocked until the Project Lead merges
this PR and authorizes TASK-22.
