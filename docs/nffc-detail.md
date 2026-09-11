# NFFC Detail (TASK-21)

`/nffc/[tokenId]` — the premium detail page: art, reference value, performance, composition,
activity, ownership, listing, offers (`docs/spec/07-ux-map.md` §5). Depends on TASK-15 (dynamic
NFFC UI components) and TASK-20 (marketplace UI), both merged.

## Acceptance criteria (`NFFC_Development_Plan.md` v3.2)

- **Every displayed datum traces to an identified on-chain or oracle origin.**
- **The page renders and is shareable without a connected wallet; a wallet is needed only for
  actions (buy, offer).**

## Real classic ISR — unlike `/market`

`/market` (TASK-20) needed `searchParams` for server-side filtering, which forces per-request
dynamic rendering under this project's caching model (`docs/OPEN_ISSUES.md` Issue #5). This route
has no such requirement: it reads only `params` (`tokenId`), so there's no tension between "server
component" and "ISR" here. `export const revalidate = 300` with no `generateStaticParams` is the
textbook on-demand-ISR pattern: a token not known at build time is rendered on its first request and
then served from that cached HTML for up to 300 seconds — the Next.js build report still lists the
route as `ƒ` (dynamic) because no params are pre-rendered at build time, but that label describes
the build step, not the runtime caching behavior (verified live: `/nffc/1` in `pnpm dev` renders as
expected; see `docs/reports/TASK-21-REPORT.md`).

## Data flow

```
/nffc/[tokenId]/page.tsx (Server Component, reads params only)
  → getNffcDetail(tokenId) (the injection point — src/lib/nffc-detail/get-nffc-detail.ts)
      → today: a static fixture (fixture-detail.ts), derived FROM TASK-20's own
        FIXTURE_LISTINGS so /market and this page agree on the same five tokens
      → TASK-24: a real indexed read, same NffcDetail shape
  → getNffcMarketSnapshot(tokenId) — the same "no price engine yet" snapshot
    /api/nffc/[tokenId]/market already returns (TASK-11/22/23), reused directly
    rather than the page self-fetching its own API route
  → notFound() (Next's built-in) if either lookup can't resolve the token
```

`NffcDetail.metadata` **is** the exact `StaticNffcMetadata` document a real mint would pin to
`staticMetadataURI` (TASK-11's `buildStaticNffcMetadata`, reused as-is in the fixture generator) —
the strongest possible traceability story for the page's static facts (art, composition, segment,
static rarity, mint-condition trait): what the page shows and what `verifyStaticMetadataAgainstChain`
can independently verify are, by construction, the same object.

## Traceability, criterion by criterion

| Shown | Source |
|---|---|
| Generative art | Deterministic pure function of the composition + `compositionHash` (TASK-12) |
| Composition table | On-chain (`NFFC.getComposition`), via `CompositionTable` (TASK-15) |
| Segment + geo notice | On-chain, derived (TASK-08); `GeoEligibilityNotice` now wired here as of the TASK-20 review's correction, not freshly added by this TASK |
| Static rarity | On-chain (`NFFC.getStaticRarity`), structural — `StaticRarityStat` (TASK-14) |
| Mint condition | Oracle-sourced, frozen at mint — `MintConditionCard`, part of the pinned static metadata (TASK-13) |
| Reference NAV + performance | `NffcMarketPanel` (TASK-15) — always carries `source` + `observedAt`, or an explicit `unavailableReason` (honest: no price engine yet, TASK-22/23) |
| Ownership | Indexed "fast path" owner, with its `last_synced_block` freshness marker shown (`docs/spec/09-data-model.md` §4) — `OwnershipCard` |
| Listing | Indexed mirror of `ListingCreated` — `ListingCard`, reusing TASK-20's `BuyButton` unchanged |
| Offers | Indexed mirror of `OfferCreated` — `OffersList`, read-only (see below) |
| Activity | Indexed mirror of the `activity` table — `ActivityTimeline`; every entry carries its block number and transaction hash |

No datum on this page is asserted without a named on-chain or oracle origin, including the fixture
placeholders — each is documented as standing in for TASK-24/22/23/31, not presented as real.

## Wallet-free by default

The whole page is a Server Component tree except two small Client islands: `BuyButton` (inside
`ListingCard`) and nothing else — there is no "make an offer" form (see below), so the only wallet
interaction on this page at all is buying. Everything else renders and is fully shareable without a
connected wallet, satisfying the second acceptance criterion structurally: nothing outside
`BuyButton` imports a wagmi hook.

## The social preview — a real per-token PNG, not a `data:` URI

TASK-18's KNOWN ISSUES already flagged that a `data:image/svg+xml,...` `og:image` won't actually
render as a social preview on real platforms (no external fetch of a `data:` URI). TASK-21 solves
this for real rather than repeating the caveat: `opengraph-image.tsx` (the Next.js file convention,
`next/og`'s `ImageResponse`) rasterizes the token's exact SVG art — passed as an `<img src>` even
though it's a `data:` URI, which Satori (the renderer behind `ImageResponse`) resolves fine — into a
1200×630 PNG **at request time**, served from a real HTTP(S) URL Next generates automatically. No
external image hosting or pinning dependency. Verified live (`docs/reports/TASK-21-REPORT.md`):
`GET /nffc/1/opengraph-image` returns `200 image/png`.

## Offers are read-only here, same scope decision as TASK-20's Buy-only choice

`OffersList` shows active offers; it has no "make an offer" form. TASK-29 (Offers) explicitly owns
the full create/accept/cancel/expiry lifecycle (`Depende de: TASK-19, TASK-24`) — the same reasoning
TASK-20 already applied to Buy vs. Offer, applied consistently here.

## What's still a fixture

- `FIXTURE_DETAILS` (`src/lib/nffc-detail/fixture-detail.ts`) stands in for the indexer (TASK-24) —
  built *from* TASK-20's `FIXTURE_LISTINGS` (same five tokens, same segments/rarity/listings), with
  a synthesized-but-shaped-correctly mint-condition trait, activity timeline, and (for one token) an
  active offer.
- `getNffcMarketSnapshot` always returns `unavailableReason` set — no price/NAV engine yet
  (TASK-22/23).
- `ListingCard`'s `BuyButton` fixture always rejects — no deployed `Marketplace` (TASK-31).
