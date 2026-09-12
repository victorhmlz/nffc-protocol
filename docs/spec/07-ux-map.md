# 07 — UX Map

**Source intent:** `NFFC_Whitepaper.md` v1.1 §6, §8, §16; `NFFC_Roadmap.md` v1.1 Fase 10–15,
Fase 26, Fase 27; `NFFC_Development_Plan.md` v3.2 TASK-16, TASK-17, TASK-18, TASK-20, TASK-21,
TASK-31.

Aesthetic (`NFFC_Development_Plan.md` TASK-03): **premium financial terminal + collectible
marketplace**. Explicitly not meme-coin / casino.

---

## 1. Surfaces and routes

| Surface | Route | Rendering | Wallet needed? |
|---|---|---|---|
| Marketplace / explore | `/` , `/market` | Server-first (Server Components + ISR) | No to browse |
| NFFC detail | `/nffc/[tokenId]` | Server-rendered + ISR; stable, shareable, correct social preview of the generative art | No to view; yes to buy/offer |
| Create wizard | `/create` | Client (wallet + signing) | Yes |
| Mint flow | part of `/create` (final steps) | Client | Yes |
| Portfolio | `/portfolio` | Client (see note¹) | Yes (shows the connected wallet's holdings) |
| Activity | `/activity`, plus per-NFFC / per-wallet timelines | Server-first | No |
| Profiles | `/profile/[address]` (creator + collector view) | Server-first — real SSR, since the wallet is in the URL | No |
| Search | `/search` (NFFCs, assets, collections, wallets) | Server-first over **indexed** data | No |
| Collection page | `/collection/[collectionId]` | Server-first | No to view |
| Admin | `/admin/*` | Client, gated by role; sensitive actions via multisig | Yes (admin) |

¹ **Portfolio note (TASK-25/27, resolves `docs/OPEN_ISSUES.md` Issue #10):** this row originally
read "Server for data + Client for actions", the same split as NFFC detail. That split needs an
address to render *against* — NFFC detail has `[tokenId]`, Profile has `[address]`, both real SSR.
`/portfolio` has no such URL segment: in this self-custody DApp, wallet identity exists only
client-side (`useAccount()`, TASK-16), so a Server Component has nothing to read. The heavy
computation still runs server-side, behind `GET /api/portfolio/[address]` — only the page shell
that decides *which* address to ask for is a Client Component. "Server for data" in this table
means real SSR keyed off the URL; it doesn't apply to a route with no address of its own.

## 2. Server-first vs. Client boundary

`NFFC_Development_Plan.md` TASK-02 convention:

- **Public, read-only, SEO/shareable** → Server Components. Marketplace, NFFC detail, profiles,
  activity, search, collection pages render without a wallet.
- **Anything touching a wallet or a signature** → Client Components: connect, network switch,
  create-wizard submission, mint, buy, list, cancel, make/accept/cancel offer, admin writes.
- Per-item on-chain reads are **not** done in a loop from the page; public data comes from the
  indexed database + cache (`03-architecture.md`, `09-data-model.md`).

## 3. Wallet transaction state machine (TASK-16)

```
IDLE ──► AWAITING_WALLET ──► SIGNING ──► SUBMITTED ──► CONFIRMING ──► SUCCESS
                  │              │            │             │
                  ▼              ▼            ▼             ▼
               REJECTED        REJECTED     FAILED        FAILED
```

Rules (`NFFC_Development_Plan.md` TASK-16 acceptance):

- **No state is skipped.** There is no direct `SIGNING → SUCCESS`.
- `SUCCESS` is reached **only** after on-chain confirmation (`NFFC_Development_Plan.md` TASK-13,
  TASK-18: "Nunca se muestra SUCCESS antes de confirmación").
- Wrong network is detected automatically and the UI offers to switch to Robinhood Chain (4663)
  before proceeding.
- `REJECTED` (user declined) is distinct from `FAILED` (revert / RPC error) in copy and recovery
  options.
- Simulation runs before `SIGNING`; a simulation failure surfaces here, not after a signature
  (`NFFC_Development_Plan.md` TASK-18 acceptance).

## 4. Create wizard (TASK-17) — 7 steps

1. **Basic information** — name, collection (new or existing), description.
2. **Asset selection** — one surface listing **both** Stock Tokens and native crypto, from
   registered `ACTIVE` representations only. No separate flows, no free-text address entry.
3. **Weights** — assign basis points; live running total toward 10,000; inline validation of I1–I4
   (`02-domain-model.md` §4).
4. **Validation** — full check against I1–I8, including representation active + asset match; blocking
   errors explained in plain language.
5. **Preview** — the **exact** generative art (must match post-mint output — TASK-17 acceptance),
   segment label, static rarity, composition table.
6. **Fees** — collection creation fee (if applicable) + mint fee + gas estimate + total, from
   on-chain quotes (`06-fee-model.md` §5). Shown **before** signing, never after.
7. **Mint** — simulate → sign → submit → confirm, driven by the state machine in §3.

## 5. NFFC detail page (TASK-21)

Shows: generative art, **Reference NAV** (labeled, never bare "value"), performance windows,
composition (per-component asset, representation, weight), segment, static rarity, mint-condition
trait, ownership, current listing, offers, activity.

- Every market data point shows its **oracle source** and **last-update timestamp**
  (`NFFC_Development_Plan.md` TASK-15 acceptance).
- Every value is traceable to an identified on-chain or oracle origin (`NFFC_Development_Plan.md`
  TASK-21 acceptance).
- Page is fully renderable and shareable **without** a connected wallet; wallet is required only for
  buy / offer actions.

## 6. Display rules (protocol-wide)

| Rule | Why |
|---|---|
| Always write "**Reference NAV**" / "Reference Value", never bare "value" or "price of the NFFC" | Avoid implying backing (`NFFC_Whitepaper.md` §7; `NFFC_Development_Plan.md` TASK-23) |
| Every market number carries `source` + `timestamp`; stale data is labeled stale | `NFFC_Development_Plan.md` TASK-15 |
| Loading and error states are explicit — never a blank value with no explanation | `NFFC_Development_Plan.md` TASK-15 |
| Compositions containing ≥1 Stock Token show the geographic-eligibility disclosure; 100%-crypto compositions show that they are not subject to that specific restriction | `NFFC_Whitepaper.md` §14; `NFFC_Development_Plan.md` TASK-08 |
| Segment (`crypto-only` / `stock-only` / `mixed`) is shown as a derived label, never user-set | `NFFC_Development_Plan.md` TASK-08 |
| Filters (composition, segment, rarity, mint condition) operate on **indexed** data, not per-item on-chain reads | `NFFC_Development_Plan.md` TASK-20 |
| "Estado del Mercado" / leaderboard-style views are **V1.5**, and their copy is legal-reviewed before publishing | `NFFC_Whitepaper.md` §16; `NFFC_Development_Plan.md` TASK-42 |

## 7. Error vocabulary (TASK-33 — unified)

Wallet rejected · insufficient funds · wrong network · reverted transaction · simulation failed ·
RPC unavailable · indexer lag (data may be behind) · API unavailable · oracle stale. Each maps to
one consistent user-facing message and a recovery action — `domain/errors/errors.ts`
(`ErrorCode`/`ERROR_VOCABULARY`), rendered by `src/components/ui/error-notice.tsx`. Every write-flow
surface (`useWriteFlow`/`useTransactionFlow`, `src/lib/wallet/classify-wallet-error.ts`) and every
API Route Handler with a genuine external call (`src/lib/api/error-response.ts`) uses this
vocabulary instead of a raw exception message; `wrong_network` (`NetworkBanner`) and `oracle_stale`
(`ReferenceNavStat`, `NffcMarketPanel`, `PortfolioSummary`) reuse the same wording their own
specialized widgets already needed. `indexer_lag` is defined and ready but not yet reachable by any
UI path — no live indexer-freshness signal exists anywhere in the pipeline before TASK-36 deploys
real contracts to index (`docs/reports/TASK-33-REPORT.md`).

## 8. Accessibility & responsive (TASK-34, seeded here)

Desktop-first but responsive; keyboard navigation, visible focus, sufficient contrast, and mobile
layouts are acceptance criteria for the design system (TASK-03) and are validated in TASK-34. No
surface ships that is unusable by keyboard.

## 9. Not in V1 UX

- Dynamic performance badges on NFFCs (V1.5, TASK-41).
- Market-State leaderboard (V1.5, TASK-42).
- Native token balances, fee-discount indicators, governance UI (V1.5, TASK-44).
- Any vault / "backed by" UI (V2).
