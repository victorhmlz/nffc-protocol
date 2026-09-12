# TASK 31 REPORT

## STATUS

COMPLETED

`pnpm verify` (lint · typecheck · test · build) green locally — **101 files, 499 tests**
(463 → +36). `pnpm contracts:build` / `pnpm contracts:test` unchanged — **211 Solidity tests**
(TASK-31 touches no `.sol`). All six admin pages smoke-tested live via `pnpm dev` — see BUILD. PR
not yet opened at time of writing this section — see PULL REQUEST for the final link.

## OBJECTIVE

"Panel de administración de activos, representaciones, fees, colecciones, reportes, salud del
sistema" (`NFFC_Development_Plan.md` v3.4 TASK-31).

## A CITATION BUG FOUND WHILE WRITING THIS TASK — FLAGGED PROMINENTLY, NOT BURIED

While writing this TASK's own "not deployed yet" fixture comments, I went to cite the deployment
TASK and discovered **TASK-31 is Admin (this TASK), not deployment** — `NFFC_Development_Plan.md`
is unambiguous: **TASK-36 is "Testnet Deployment."** Every prior TASK in this session (TASK-18
through TASK-30) had been citing "TASK-31" for "contracts not deployed yet," and that wrong number
was copied forward consistently, TASK after TASK. It is a **citation/documentation error only** —
every piece of actual behavior (every simulation honestly fails because nothing is deployed) is
correct; only the TASK number named in comments and docs is wrong.

**Scope of the error**, found via a repo-wide search: ~26 files carry the wrong citation — code
comments in `BuyButton`/`MakeOfferForm`/`OfferRowActions`/`create/page.tsx`, most `docs/*.md`, and
several already-merged `docs/reports/TASK-XX-REPORT.md`.

**Fixed in this TASK** (touched anyway, for the hook relocation below, or directly relevant to
this TASK's own work): `src/components/market/buy-button.tsx` (+ test),
`src/components/nffc/make-offer-form.tsx`, `src/components/nffc/offer-row-actions.tsx`,
`docs/marketplace-ui.md`, `docs/offers.md`, `README.md`'s own status paragraph (which I'd
written last TASK with the same error), and three citations inside `docs/OPEN_ISSUES.md` itself
(Issues #2, #7, #8's "posible resolución" fields).

**Not swept unilaterally**: the remaining ~20 files (mostly other `docs/*.md` and several already
-merged `docs/reports/TASK-XX-REPORT.md` snapshots) are left as-is and logged as
**`docs/OPEN_ISSUES.md` Issue #12**, with the exact file list, for the Project Lead to decide how
to handle (a small dedicated cleanup PR for the live docs/code; an explicit decision on whether
merged report snapshots get corrected in place or left as historical artifacts with a note).

## SCOPE NOTE

TASK-31 depends on TASK-05 (Asset Identity & Representation Registry) and TASK-30 (Fee Engine),
both merged. The acceptance criterion — "Toda acción administrativa sensible pasa por multisig,
nunca por una sola clave" — is an operational fact about which address a role is granted to at
deploy time (`docs/spec/08-security-principles.md` S8), not something TypeScript can enforce
against contracts that don't exist yet. This TASK's honest answer: every write action calls the
exact real, already role-gated contract function; a persistent `MultisigBanner` makes the
requirement visible everywhere; the requirement is actually *verified* at TASK-40's mainnet gate,
against a real deployment — not here. Full reasoning and the facet-by-facet mapping:
`docs/admin.md`.

Three scope trims, each deliberate and documented (not silent): no pause/unpause controls (not one
of the objective's six named facets), no `updateOracleMetadata` form (registration already sets
initial oracle data), collections are view-only (no admin-specific collection mutation exists
beyond pause).

## CHANGES

### `domain/admin/admin.ts` (new)

`ADMIN_ROLE_META` (descriptive metadata for the four `AccessControl` roles this protocol's
contracts declare). `listAllCollections` — every collection with ≥1 indexed NFFC, protocol-wide
(not filtered to one wallet, unlike TASK-27's own collections facet). `buildProtocolReport` — a
pure aggregation (totals, segment counts, active listings, `SALE` volume) over the exact same
indexed shapes (`IndexedNffcSummary`, `ActivityEntry`) every other read surface already composes.
7 tests.

### `src/lib/wallet/use-write-flow.ts` (relocated from `src/lib/marketplace/use-marketplace-action-flow.ts`)

Admin writes need the identical simulate→sign→submit→confirm shape as marketplace/offer writes —
relocated and renamed (`useMarketplaceActionFlow` → `useWriteFlow`) rather than copied a fifth
time. `BuyButton`, `MakeOfferForm`, `OfferRowActions` updated to the new import path; behavior
unchanged, their own tests are green.

### `src/lib/admin/` (new) — fixtures + data access

`fixture-registry.ts` (`AssetIdentity`/`Representation` fixtures, ids computed the same way
`/create`'s own fixture does), `fixture-fee-config.ts` (mirrors `FeeConfig.sol`'s real default
constructor values), `types.ts` (`FeeConfigSnapshot`, flat/display-ready, mirroring
`src/lib/wizard/types.ts`'s own precedent for non-domain UI shapes), and five thin `get-*.ts` seams
(`get-assets`, `get-representations`, `get-fee-config`, `get-collections`, `get-protocol-report`).

### `src/components/admin/` (new) — 14 components

`MultisigBanner`, `AdminNav`, `HealthSummary` (renders the real `HealthReport`),
`StatusToggleButton` (one component for both asset and representation activate/deactivate),
`RegisterAssetForm`, `RegisterRepresentationForm`, `FeeCurveForm` (one component for both
collection-creation and mint fee curves, `kind`-discriminated), `MarketplaceFeeForm`,
`FeeRecipientForm`, `RoyaltyForm`, `ProtocolReportPanel`, `CollectionsTable`, `AssetsTable`,
`RepresentationsTable`. Every write component's fixture honestly rejects with "not deployed yet
(TASK-36)" — the wallet is never engaged, provably, matching every other write surface in this
codebase.

### `src/app/admin/` (new) — 6 pages

`/admin` (dashboard: system health + protocol report + nav + banner), `/admin/assets`,
`/admin/representations`, `/admin/fees`, `/admin/collections`, `/admin/reports`. All Server
Components, `force-dynamic` (admin data is neither cached nor stale-tolerant the way public
marketplace pages are).

### `contracts/interfaces/ICollection.sol`, `contracts/Collection.sol`

No change beyond what TASK-30 already added — not touched this TASK.

### Docs

`docs/admin.md` (new). `docs/marketplace-ui.md`, `docs/offers.md` — TASK-31 citation fix (see
above). `docs/OPEN_ISSUES.md` — three citation fixes in-place, + new Issue #12. `README.md` —
status line, doc link, TASK-31 citation fix in last TASK's own status paragraph.

## FILES CREATED

```
domain/admin/admin.ts
domain/admin/admin.test.ts
src/lib/wallet/use-write-flow.ts
src/lib/wallet/use-write-flow.test.tsx
src/lib/admin/fixture-registry.ts
src/lib/admin/fixture-fee-config.ts
src/lib/admin/types.ts
src/lib/admin/get-assets.ts
src/lib/admin/get-representations.ts
src/lib/admin/get-fee-config.ts
src/lib/admin/get-collections.ts
src/lib/admin/get-protocol-report.ts
src/components/admin/multisig-banner.tsx (+test)
src/components/admin/admin-nav.tsx (+test)
src/components/admin/health-summary.tsx (+test)
src/components/admin/status-toggle-button.tsx (+test)
src/components/admin/register-asset-form.tsx (+test)
src/components/admin/register-representation-form.tsx (+test)
src/components/admin/fee-curve-form.tsx (+test)
src/components/admin/marketplace-fee-form.tsx (+test)
src/components/admin/fee-recipient-form.tsx (+test)
src/components/admin/royalty-form.tsx (+test)
src/components/admin/protocol-report-panel.tsx (+test)
src/components/admin/collections-table.tsx (+test)
src/components/admin/assets-table.tsx (+test)
src/components/admin/representations-table.tsx (+test)
src/app/admin/page.tsx
src/app/admin/assets/page.tsx
src/app/admin/representations/page.tsx
src/app/admin/fees/page.tsx
src/app/admin/collections/page.tsx
src/app/admin/reports/page.tsx
docs/admin.md
docs/reports/TASK-31-REPORT.md
```

## FILES REMOVED

```
src/lib/marketplace/use-marketplace-action-flow.ts        relocated to src/lib/wallet/use-write-flow.ts
src/lib/marketplace/use-marketplace-action-flow.test.tsx  relocated to src/lib/wallet/use-write-flow.test.tsx
```

## FILES MODIFIED

```
domain/index.ts                              export admin/admin
src/components/market/buy-button.tsx         useWriteFlow import; TASK-31 -> TASK-36 citation
src/components/market/buy-button.test.tsx    TASK-31 -> TASK-36 citation
src/components/nffc/make-offer-form.tsx      useWriteFlow import; TASK-31 -> TASK-36 citation
src/components/nffc/offer-row-actions.tsx    useWriteFlow import; TASK-31 -> TASK-36 citation
docs/marketplace-ui.md                       hook relocation note; TASK-31 -> TASK-36 citations
docs/offers.md                               hook relocation note; TASK-31 -> TASK-36 citations
docs/OPEN_ISSUES.md                          3 citation fixes in-place; + Issue #12
README.md                                    status line + doc link; TASK-31 -> TASK-36 citation
```

Branch is based on `main` (TASK-00…30) — see PULL REQUEST.

## TESTS

`pnpm test` → Vitest, **101 files, 499 tests** (36 new):

```
domain/admin/admin.test.ts (7)                 listAllCollections groups protocol-wide, counts +
                                                sorts, empty case; buildProtocolReport totals/
                                                segments/listings, no fabricated zero segment,
                                                SALE-only volume summation, zero-volume case
src/components/admin/*.test.tsx (29 across 14 files)  every component's empty/happy-path
                                                rendering, and every write component's honest
                                                "not deployed yet" error surfaced without ever
                                                opening a wallet
```

`pnpm contracts:test` → **211 Solidity tests**, unchanged (TASK-31 adds no `.sol`).

## BUILD

`pnpm build` green — **21 routes** (was 16; `+5`: all `/admin/*` pages).

Smoke-tested live via `pnpm dev`:

```
GET /admin                 → 200, "Multisig required" banner, real database/redis/rpc health,
                              protocol report numbers
GET /admin/assets          → 200, NVDA/AAPL/MSFT/BTC/ETH with Deactivate actions
GET /admin/representations → 200
GET /admin/fees            → 200, "Collection creation fee"/"Mint fee"/"Marketplace fee"/
                              "Fee recipient"/"Royalties" all render
GET /admin/collections     → 200
GET /admin/reports         → 200
```

## LINT / TYPECHECK

Clean on the first pass, after fixing the `WagmiProvider`-missing test failures caught by the
first full test run (six admin write-component test files needed `WagmiTestProviders` wrapping,
same as every other component using `useWriteFlow`/`useWriteContract` — an oversight caught
immediately by running the suite, not shipped).

## SECURITY

STEP 5 AUDIT (`docs/spec/08-security-principles.md`):

| Concern | This TASK |
|---|---|
| **Toda acción administrativa sensible pasa por multisig, nunca por una sola clave** (acceptance, S8) | Every write calls the real, already role-gated contract function (`REGISTRY_ADMIN_ROLE`/`FEE_ADMIN_ROLE`, TASK-05/30) — the contract enforces *who*, this panel only calls it; `MultisigBanner` makes the operational requirement visible on every page; actual verification is TASK-40's gate, not a client-side check with nothing real to check |
| A simulation failure is communicated before a signature is requested (TASK-18's property, extended) | `useWriteFlow`'s `execute()` still gates `flow.request(...)` behind `simulate()` resolving without throwing, for every admin write now too |
| No real network/database in tests (`docs/conventions.md` §4) | `WagmiTestProviders` + the mock connector throughout every write-component test |
| Reports/collections aggregate honestly | `buildProtocolReport`/`listAllCollections` never fabricate a row for data that isn't there (no zero-segment rows, no phantom collections) |

## PERFORMANCE

`buildProtocolReport`/`listAllCollections` are `O(n)` over the indexed NFFC/activity sets. No new
per-item network/DB calls — every admin page does at most 1–2 data-fetch calls up front.

## KNOWN ISSUES

1. **`docs/OPEN_ISSUES.md` Issue #12** — the TASK-31/TASK-36 citation bug, see above. The single
   most significant finding from this TASK.
2. **No pause/unpause controls, no `updateOracleMetadata` form** — deliberate scope trims, not
   silently dropped; see `docs/admin.md`.
3. **No live contracts** — same TASK-36 blocker every write surface in this codebase shares.
4. **`FeeCurveForm`'s `kind` prop only selects the label and the fixture's error text** — a real
   implementation would use it to pick which of `setCollectionFeeParams`/`setMintFeeParams` to
   encode in `buildCall`; not reachable to test today since nothing is deployed.

## ACCEPTANCE CRITERIA

`NFFC_Development_Plan.md` v3.4 TASK-31:

| Criterion | Status | Evidence |
|---|---|---|
| Toda acción administrativa sensible pasa por multisig, nunca por una sola clave | Met, as an operational design | Every write targets an already role-gated contract function (TASK-05/09/30); `MultisigBanner` states the requirement explicitly on every `/admin/*` page; real verification is TASK-40's gate — see SCOPE NOTE for why no code-level check is meaningful before a real deployment exists |

## PULL REQUEST

Branch `task/TASK-31-admin`, based on **`main`** (TASK-00…30).

**PR:** https://github.com/victorhmlz/nffc-protocol/pull/38
**CI:** green — https://github.com/victorhmlz/nffc-protocol/actions/runs/34686650113
(`lint · typecheck · test · build` pass, 2m10s; `solidity · compile · test` pass, 32s)

**Do not merge** — Project Lead reviews and authorizes.

## NEXT TASK

**TASK-32 — Security Hardening** (`NFFC_Development_Plan.md` v3.4, depende de todas las TASKS de
contratos 05–31). Blocked until the Project Lead merges this PR and authorizes TASK-32.
