# TASK 33 REPORT

## STATUS

COMPLETED

`pnpm verify` (lint · typecheck · test · build) green — **105 files, 513 tests** (was 101/499;
+4 files, +14 tests). 21 routes, unchanged. `pnpm contracts:test` untouched: 224 Solidity tests (no
`.sol` touched this TASK). Live smoke test via `pnpm dev`: `/market`, `/nffc/1`, `/admin`, and
`/api/portfolio/[address]` all verified rendering/responding correctly.

## OBJECTIVE

"Unificar errores de wallet, blockchain, API, RPC e indexer en un vocabulario consistente para el
usuario" (`NFFC_Development_Plan.md` v3.4 TASK-33). Depends on TASK-16 (wallet) and TASK-24
(indexer), both merged. No open issue self-nominated for this TASK; no conditions attached to this
authorization.

## WHAT INSPECT FOUND

`docs/spec/07-ux-map.md` §7 had already named the nine target categories ("seeded here, unified in
TASK-33") — this TASK's job was defining that vocabulary as real code and finding every place a raw,
unfiltered error message was reaching a user instead of it. Two concrete gaps found:

1. **Every one of the ten write-flow components in this codebase** (`BuyButton`, `MakeOfferForm`,
   `OfferRowActions`, `StatusToggleButton`, and five admin fee/registry forms) rendered
   `{flow.error}` — the raw wagmi/viem exception message — directly inside a `role="alert"` element.
   This included, today, the honest fixture text ("X is not deployed yet (TASK-36)"), but was never
   going to be acceptable once real wallet/RPC errors start flowing through the same path.
2. **The same "oracle stale" condition had three different wordings** across `ReferenceNavStat`
   ("Stale"), `NffcMarketPanel` ("Some component prices are stale — figures may be degraded"), and
   `PortfolioSummary` ("Some holdings' prices are stale or unavailable") — no functional bug, but
   exactly the inconsistency this TASK exists to remove.

No genuine indexer-freshness signal exists anywhere in the codebase yet (verified via a repo-wide
search for "watermark"/"lastIndexedBlock"/similar — nothing found), so `indexer_lag` is defined and
ready but not wired to any UI path — see KNOWN ISSUES.

## CHANGES

### `domain/errors/errors.ts` (new) — the vocabulary

`ErrorCode` (9 values, exactly `docs/spec/07-ux-map.md` §7's list) + `ERROR_VOCABULARY: Record<ErrorCode,
{message, recoveryAction, tone}>`. Pure, framework-agnostic — no wagmi/fetch/Postgres import.
`tone: "warning"` for the two categories where data is still shown (`oracle_stale`, `indexer_lag`,
plus `wrong_network` since a one-click fix is available), `"critical"` for the rest. 4 tests
(completeness, non-empty text, no duplicate messages, correct warning/critical split).

### `src/components/ui/error-notice.tsx` (new) — the one rendering

Sibling to `TransactionStatus` (icon + message + recovery action, `role="alert"` `aria-live="assertive"`,
tone-based color from the same `status-critical`/`status-warning` design tokens `Badge` already
uses). Every write component now renders `<ErrorNotice code={flow.errorCode} />` instead of a raw
string. 2 tests (every code renders its vocabulary text; alert role present).

### Wallet / blockchain

- `src/lib/wallet/classify-wallet-error.ts` (new) — classifies a terminal `"rejected"`/`"failed"`
  state into a code, reusing `transaction-flow.ts`'s own existing rejection detection rather than
  re-parsing the message a second time; only adds one further split (`insufficient_funds` vs.
  `transaction_reverted`) that didn't exist before. 3 tests.
- `transaction-flow.ts` / `use-write-flow.ts` — both hooks gained `errorCode: ErrorCode | null`;
  `error: string | null` is kept (for logs) but no longer meant to be rendered. A `simulate()`
  rejection always classifies as `simulation_failed` (it never reaches `transactionFlowReducer`).
- **10 write components updated**: `buy-button.tsx`, `make-offer-form.tsx`, `offer-row-actions.tsx`,
  `status-toggle-button.tsx`, `fee-curve-form.tsx`, `fee-recipient-form.tsx`,
  `marketplace-fee-form.tsx`, `register-asset-form.tsx`, `register-representation-form.tsx`,
  `royalty-form.tsx` — each swapped its raw `{flow.error}` paragraph for
  `{flow.errorCode && <ErrorNotice code={flow.errorCode} />}`. Their 10 test files were updated to
  assert the new unified text (`/can't be completed right now/i`, the `simulation_failed` message)
  instead of the raw fixture message they previously asserted on — this is an intentional behavior
  change (raw messages are no longer shown), not a test-following-implementation-blindly update.

### Wrong network

`NetworkBanner` keeps its own component (a one-click "Switch network" button beats the vocabulary's
generic text hint) but now renders `ERROR_VOCABULARY.wrong_network.message` ("Wrong network") as its
headline instead of a hardcoded string, so the same word appears everywhere this category is named.

### Oracle stale

`NffcMarketPanel` and `PortfolioSummary` now both render `ERROR_VOCABULARY.oracle_stale.message`
("Some prices are stale") instead of their two previously-different sentences.
`ReferenceNavStat`'s short "Stale" badge (space-constrained, inline next to a NAV figure) is kept
as-is but gained a `title` tooltip carrying the same `recoveryAction` text, for consistency without
a layout change. 2 component tests updated to match the new shared wording.

### API routes

`src/lib/api/error-response.ts` (new) — `apiErrorResponse(code)` builds a `{code, message,
recoveryAction}` 503; `withApiErrorHandling(handler)` wraps a Route Handler so any unexpected thrown
error gets that shape instead of Next's generic 500, logging the real error server-side first.
`RpcConfigError` classifies as `rpc_unavailable`; anything else as `api_unavailable`. 5 tests.

Wired into `/api/portfolio/[address]` and `/api/nffc/[tokenId]/market` (both call an async
data-access seam capable of throwing today). Deliberately **not** wired into
`/api/nffc/[tokenId]/metadata` (makes no async call yet — would be inert boilerplate) or
`/api/health`/`/api/ready` (`checkHealth()` is documented to never throw — see
`infra/health.ts`'s own doc comment). All three routes' existing deliberate 200/503 "not available
yet" bodies are untouched — those are tested domain states, not the gap this TASK closes.

### `docs/spec/07-ux-map.md` §7

Updated from "unified later, seeded here" to reflect the real implementation — names the concrete
modules/components and is explicit that `indexer_lag` is defined but not yet reachable.

### `docs/error-handling.md` (new), `README.md`

Full write-up of the vocabulary, every wiring point, and the two explicit scope boundaries
(`indexer_lag`, the un-wrapped API routes).

## FILES CREATED

```
domain/errors/errors.ts
domain/errors/errors.test.ts
src/components/ui/error-notice.tsx
src/components/ui/error-notice.test.tsx
src/lib/wallet/classify-wallet-error.ts
src/lib/wallet/classify-wallet-error.test.ts
src/lib/api/error-response.ts
src/lib/api/error-response.test.ts
docs/error-handling.md
docs/reports/TASK-33-REPORT.md
```

## FILES MODIFIED

```
domain/index.ts                                    export errors/errors
src/lib/wallet/transaction-flow.ts                 + errorCode field
src/lib/wallet/use-write-flow.ts                   + errorCode field
src/lib/wallet/use-write-flow.test.tsx             + errorCode assertion
src/components/ui/index.ts                         export ErrorNotice
src/components/ui/nffc-market-panel.tsx            oracle_stale wording unified
src/components/ui/nffc-market-panel.test.tsx       assertion updated
src/components/ui/reference-nav-stat.tsx           oracle_stale tooltip added
src/components/portfolio/portfolio-summary.tsx     oracle_stale wording unified
src/components/portfolio/portfolio-summary.test.tsx  assertion updated
src/components/wallet/network-banner.tsx           wrong_network headline reused
src/components/market/buy-button.tsx (+test)       ErrorNotice; test updated
src/components/nffc/make-offer-form.tsx (+test)    ErrorNotice; test updated
src/components/nffc/offer-row-actions.tsx (+test)  ErrorNotice; test updated
src/components/admin/status-toggle-button.tsx (+test)          ErrorNotice; test updated
src/components/admin/fee-curve-form.tsx (+test)                ErrorNotice; test updated
src/components/admin/fee-recipient-form.tsx (+test)            ErrorNotice; test updated
src/components/admin/marketplace-fee-form.tsx (+test)          ErrorNotice; test updated
src/components/admin/register-asset-form.tsx (+test)           ErrorNotice; test updated
src/components/admin/register-representation-form.tsx (+test) ErrorNotice; test updated
src/components/admin/royalty-form.tsx (+test)                  ErrorNotice; test updated
src/app/api/portfolio/[address]/route.ts           wrapped with withApiErrorHandling
src/app/api/nffc/[tokenId]/market/route.ts          wrapped with withApiErrorHandling
docs/spec/07-ux-map.md                             §7 updated: seeded -> unified
README.md                                          status paragraph; docs/error-handling.md link
```

No `.sol` file touched. Branch is based on `main` (TASK-00…32) — see PULL REQUEST.

## TESTS

`pnpm test` → **105 files, 513 tests** (+4 files, +14 tests):

```
domain/errors/errors.test.ts (4)
src/lib/wallet/classify-wallet-error.test.ts (3)
src/components/ui/error-notice.test.tsx (2)
src/lib/api/error-response.test.ts (5)
+1 assertion added to use-write-flow.test.tsx (errorCode)
10 write-component test files updated in place (same test count, new assertions)
2 oracle_stale test assertions updated in place (nffc-market-panel, portfolio-summary)
```

`pnpm contracts:test` → unchanged, 224 Solidity tests.

## BUILD

`pnpm build` → unchanged, 21 routes.

## LINT / TYPECHECK

Clean. `withApiErrorHandling`'s generic wrapper (`<Args extends unknown[]>`) infers the exact Next
Route Handler signature (`NextRequest`, `RouteContext<"...">`) from each call site without any
explicit type argument — verified by `next typegen && tsc --noEmit` passing on both wrapped routes.

## SECURITY

STEP 5 AUDIT (`docs/spec/08-security-principles.md` A2/A5): no raw exception text (which can leak
implementation details — contract addresses, internal error codes, stack-trace-shaped viem output)
reaches a user-facing surface anymore on the ten write-flow components or the two wrapped API
routes; every one now shows only a vetted, static vocabulary string. Raw messages are still captured
in `error`/server logs for debugging, never discarded — this is a presentation-layer fix, not a loss
of diagnostic information.

## PERFORMANCE

Negligible — `ERROR_VOCABULARY` is a small static object; `classifyWalletError`/`withApiErrorHandling`
are O(1) per call.

## KNOWN ISSUES

1. **`indexer_lag` is defined but unreachable by any UI path.** No live "how far behind is the
   indexer" signal exists anywhere in this codebase — every indexed-data read is still
   fixture-backed pending TASK-36. Building that signal is new capability (arguably TASK-24's own
   follow-up, or TASK-39 Observability), not "unifying an error that already occurs," so it's
   explicitly out of this TASK's scope rather than silently skipped. Not logged as an
   `OPEN_ISSUES.md` entry — it isn't a defect, it's an honestly-stated scope boundary matching the
   same "not deployed yet" pattern every other forward-dependent feature in this codebase carries.
2. **`/api/nffc/[tokenId]/metadata`, `/api/health`, `/api/ready` are not wrapped** in
   `withApiErrorHandling` — each has a specific, stated reason (see CHANGES). Revisit if any of
   these three routes gains a real async call that can throw.
3. **No forced-throw integration test exists for the two wrapped routes** (`portfolio`, `market`) —
   `error-response.test.ts` unit-tests `withApiErrorHandling`'s classification directly and
   thoroughly; mocking the underlying data-access module to force a throw in each route's own test
   file was judged disproportionate for a one-line wrapper application. Flagged here rather than
   silently omitted.

## ACCEPTANCE CRITERIA

`NFFC_Development_Plan.md` v3.4 TASK-33 objective (no bulleted acceptance criteria listed in the
plan for this TASK — `docs/spec/07-ux-map.md` §7's nine-category vocabulary is the concrete target):

| Criterion | Status | Evidence |
|---|---|---|
| Wallet errors unified | Met | `classify-wallet-error.ts` + `ErrorNotice`, wired into all 10 write components |
| Blockchain (revert/simulation) errors unified | Met | `transaction_reverted`/`simulation_failed` codes, same wiring |
| API errors unified | Met (for routes with a real throw path) | `withApiErrorHandling` on portfolio/market routes |
| RPC errors unified | Met | `rpc_unavailable` code, `RpcConfigError` classification in `withApiErrorHandling` |
| Indexer errors unified | Partially — vocabulary defined, not reachable | See KNOWN ISSUES #1 |

## PULL REQUEST

Branch `task/TASK-33-error-handling`, based on **`main`** (TASK-00…32).

**PR:** https://github.com/victorhmlz/nffc-protocol/pull/40
**CI:** green — https://github.com/victorhmlz/nffc-protocol/actions/runs/34697111935
(`lint · typecheck · test · build` pass, 2m18s; `solidity · compile · test` pass, 30s)

**Do not merge** — Project Lead reviews and authorizes.

## NEXT TASK

**TASK-34 — Responsive & Accessibility** (`NFFC_Development_Plan.md` v3.4, depende de TASK-03 y
toda la superficie de UI construida hasta el momento). Blocked until the Project Lead merges this PR
and authorizes TASK-34.
