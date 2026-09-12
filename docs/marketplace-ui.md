# Marketplace UI (TASK-20)

`/market` — explore, filter, sort, and buy NFFCs (`docs/spec/07-ux-map.md` §1: "Marketplace /
explore"). Depends on TASK-03 (design system), TASK-16 (wallet), TASK-19 (`Marketplace.sol`).

## Acceptance criterion (`NFFC_Development_Plan.md` v3.2)

- **Filters by composition (segment: crypto-only/stock-only/mixed), rarity, and mint condition work
  over indexed data, never a per-item on-chain read.**

## The forward-dependency pattern, again

TASK-20's own entregable says the UI connects to "TASK-19 e Indexer (TASK-24)" — but the indexer
doesn't exist yet (`Depende de: TASK-03, TASK-16, TASK-19`, not TASK-24). Following the pattern
established since TASK-11, this TASK builds against the **exact eventual indexed data contract**
(`domain/marketplace/listings.ts`'s `IndexedNffcSummary`, mirroring `docs/spec/09-data-model.md`'s
`nffc` / `nffc_component` / `listing` tables flattened into one read shape) with the indexer itself
supplied via one injected function, `GetMarketplaceListings`
(`src/lib/marketplace/get-listings.ts`), fixture-backed until TASK-24 lands.

The acceptance criterion is proven **structurally**, the same way TASK-16/17's reducers made their
own acceptance criteria structural rather than conventional: `domain/marketplace/listings.ts`
(`queryListings`, the filter/sort/paginate engine) and `get-listings.ts` import nothing from
`infra/rpc` or any per-item chain reader — there is no code path by which a filter could fall back
to an on-chain call, fixture or not.

## Data flow

```
/market/page.tsx (Server Component, reads searchParams)
  → parseMarketplaceSearchParams (pure — src/lib/marketplace/parse-query.ts)
  → getMarketplaceListings(query) (the injection point — src/lib/marketplace/get-listings.ts)
      → today: queryListings(FIXTURE_LISTINGS, query) (domain/marketplace/listings.ts), unstable_cache'd
      → TASK-24: a real indexed SQL query, same filter/sort/paginate semantics
  → <MarketFilters> (Client — reads/writes the URL) + <NffcGrid> + <Pagination> (Server)
```

`MarketFilters` holds no state of its own — the URL is the single source of truth (parsed
server-side), so a shared or bookmarked `/market?segment=MIXED&regime=near-highs&sort=price_asc`
link reproduces the exact same result set, not just the exact same UI.

## Buy — reusing TASK-18's mint-flow pattern, not reinventing it

`useWriteFlow` (`src/lib/wallet/use-write-flow.ts` — generalized in TASK-29 from this TASK's
original `useBuyFlow` as `useMarketplaceActionFlow`, once "buy" got two more actions as siblings:
create/cancel/accept offer, all needing the identical shape; relocated and renamed again in
TASK-31 once admin writes needed it too) is `useMintFlow` minus the
metadata-prep step: a `simulate` → `buildCall` pre-flight composed *outside* TASK-16's
`transactionFlowReducer` (unmodified, again), so a simulation failure surfaces before any signature
is requested — the same acceptance property TASK-18 established for mint, reused rather than
re-derived. `BuyButton` (`src/components/market/buy-button.tsx`) is the Client Component island
inside each (Server) `NffcCard` — functions can't cross the server/client RSC boundary, so its
fixture `simulateBuy` / `buildBuyCall` are defined locally in the client file, not passed down as
props from the server page (unlike `/create`, which is a Client page throughout and can inject
fixtures via props).

`Marketplace.sol` has no deployed address yet (TASK-36), so `simulateBuy` always rejects with
"Marketplace is not deployed yet (TASK-36)" — an honest, live demonstration that the wallet is never
engaged, exactly like `/create`'s mint fixture.

## Server-rendered, but not classic ISR — a documented tension

The entregable calls for "Server Components + ISR" for SEO/social previews. Reading `searchParams`
(required for server-side filtering — the literal acceptance criterion) opts a route into
per-request **dynamic** rendering under this project's caching model (`cacheComponents` is not
enabled in `next.config.ts`, so the "previous model" applies — plain `searchParams` access, not
Cache Components' `<Suspense>`-scoped runtime APIs). `/market` cannot simultaneously be a
fully-prerendered static shell (classic ISR) and filter server-side via `searchParams` under that
model — the two literal words in the entregable ("Server Components" and "ISR") pull in different
directions once filtering is a hard requirement.

**What's actually delivered:** `/market` is still fully server-rendered (SSR) on every request — no
client-side fetch waterfall, fully crawlable, correct for any given URL including social previews of
a specific filtered view — but each distinct query string is rendered dynamically rather than served
from a prebuilt static page. The underlying data fetch (`get-listings.ts`) is cached via
`unstable_cache` (`revalidate: 300`), so repeated requests for the same query don't redo the query
work — the caching-at-the-data-layer equivalent of ISR, not ISR of the HTML shell itself. Enabling
`cacheComponents` (this Next version's Partial Prerendering successor) would let the filterless
"App Shell" prerender while filtered results stream in behind a `<Suspense>` boundary — a
project-wide toggle with consequences well beyond this one route, out of scope to flip unilaterally
in TASK-20. Flagged as `docs/OPEN_ISSUES.md` Issue #5.

## What's still a fixture

- `FIXTURE_LISTINGS` (`src/lib/marketplace/fixture-listings.ts`) stands in for the indexer
  (TASK-24) — five representative NFFCs spanning every segment, a spread of static rarity and
  mint-condition regimes, and both listed and unlisted tokens.
- `BuyButton`'s `simulateBuy` always rejects — no deployed `Marketplace` (TASK-36).
- `NffcCard` links to `/nffc/[tokenId]` (TASK-21), which doesn't exist yet — a 404 until then, not a
  regression; the URL contract is the one TASK-21's own route will fill in unchanged.

## Not in TASK-20's scope

- **Offers** ("compra/oferta" in the Entregable's own wording, but the Objetivo's verb list —
  "Explorar, buscar, filtrar, ordenar, listar, comprar" — omits "ofertar", and TASK-29 (Offers) is
  the TASK that explicitly owns create/accept/cancel/expiry for the full offer lifecycle,
  `Depende de: TASK-19, TASK-24`). TASK-20 implements Buy only; offer creation was TASK-29's job,
  not silently dropped — see `docs/reports/TASK-20-REPORT.md` KNOWN ISSUES. **Built in TASK-29** —
  see `docs/nffc-detail.md` and `docs/reports/TASK-29-REPORT.md`.
- Whether `/` (the TASK-01 bootstrap landing page) should become or redirect to `/market` — the
  ux-map lists `/` and `/market` as the same "Marketplace / explore" surface, but TASK-20
  deliberately only builds `/market`, leaving `/` untouched. Flagged as `docs/OPEN_ISSUES.md`
  Issue #6.
