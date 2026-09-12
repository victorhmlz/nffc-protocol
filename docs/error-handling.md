# Error Handling (TASK-33)

"Unificar errores de wallet, blockchain, API, RPC e indexer en un vocabulario consistente para el
usuario" (`NFFC_Development_Plan.md` v3.4 TASK-33). Depends on TASK-16 (wallet) and TASK-24
(indexer), both merged. Seeded in `docs/spec/07-ux-map.md` §7, which named the nine categories this
TASK unifies — this document is where that seed becomes real code.

## The vocabulary

`domain/errors/errors.ts` — one pure, framework-agnostic module: an `ErrorCode` union and an
`ERROR_VOCABULARY` record mapping each code to a `{message, recoveryAction, tone}`. It knows
nothing about wagmi, `fetch`, or Postgres; *classifying* a raw error into one of these codes is
specific to where that error comes from, so each classifier lives at its own edge and all of them
import this one module — the words a user sees never fork into two different phrasings for the
same condition.

| Code | Message | Recovery action | Tone |
|---|---|---|---|
| `wallet_rejected` | Wallet request rejected | You can try again whenever you're ready. | critical |
| `insufficient_funds` | Insufficient funds | Add funds to your wallet and try again. | critical |
| `wrong_network` | Wrong network | Switch to Robinhood Chain and try again. | warning |
| `transaction_reverted` | Transaction reverted | The transaction did not go through. Check the details and try again. | critical |
| `simulation_failed` | This action can't be completed right now | Try again shortly. | critical |
| `rpc_unavailable` | Network connection unavailable | The blockchain connection is temporarily unavailable. Try again shortly. | critical |
| `indexer_lag` | Data may be behind | Recently confirmed activity can take a few moments to appear here. | warning |
| `api_unavailable` | Service unavailable | This service is temporarily unavailable. Try again shortly. | critical |
| `oracle_stale` | Some prices are stale | Figures may be degraded until fresh oracle data is available. | warning |

`tone: "warning"` marks a condition where data is still shown alongside the notice (stale prices,
possible lag); `"critical"` marks an action that was blocked outright.

## Rendering: `ErrorNotice`

`src/components/ui/error-notice.tsx` — the one rendering of the vocabulary, sibling to
`TransactionStatus` (icon + label + description, `role="alert"`, never colour alone). Every
write-flow component in this codebase (`BuyButton`, `MakeOfferForm`, `OfferRowActions`,
`StatusToggleButton`, and the five admin fee/registry forms) renders `<ErrorNotice code={...} />`
instead of a raw `{flow.error}` string — the exact gap this TASK found: every one of those ten
components was rendering an unfiltered wagmi/viem exception message directly to the user before
this TASK.

## Wallet / blockchain

`src/lib/wallet/classify-wallet-error.ts` classifies a terminal wallet-flow state
(`"rejected"`/`"failed"`) into a code — `"rejected"` always maps to `wallet_rejected`; `"failed"`
splits into `insufficient_funds` (message matches `/insufficient funds/i`) or the
`transaction_reverted` fallback. It deliberately reuses `transaction-flow.ts`'s own existing
rejection detection (`/user rejected|user denied/i`, computed once into `TransactionState`) rather
than re-parsing the raw message a second time.

`useTransactionFlow` (`transaction-flow.ts`) and `useWriteFlow` (`use-write-flow.ts`) both gained an
`errorCode: ErrorCode | null` field alongside their existing `error: string | null` — `error` is
kept only for logs, never rendered directly anymore. A `simulate()` rejection (pre-signature, TASK-18's
"never opens the wallet on a simulation failure" property) always classifies as `simulation_failed`
— it never reaches `transactionFlowReducer` to be classified any other way.

## Wrong network

`NetworkBanner` (TASK-16) already had the best possible recovery action for this category — a
one-click "Switch network" button, strictly better than the vocabulary's own text hint — so it
keeps its own component rather than rendering a generic `ErrorNotice`. It now reuses
`ERROR_VOCABULARY.wrong_network.message` ("Wrong network") as its headline, so the same words appear
here as anywhere else this category is mentioned.

## Oracle stale

Before this TASK, three surfaces described the same underlying condition (`degraded`/`stale` flags
from `domain/pricing/types.ts`/`domain/valuation/types.ts`, TASK-15/22) in three different words:
`ReferenceNavStat`'s "Stale" badge, `NffcMarketPanel`'s "Some component prices are stale — figures
may be degraded", and `PortfolioSummary`'s "Some holdings' prices are stale or unavailable". The
latter two now both render `ERROR_VOCABULARY.oracle_stale.message` ("Some prices are stale");
`ReferenceNavStat`'s short "Stale" badge is kept as-is (space-constrained, inline next to a NAV
figure) but gained a `title` tooltip carrying the same `recoveryAction` text as the other two.

## API routes

`src/lib/api/error-response.ts` — `withApiErrorHandling(handler)` wraps a Route Handler so any
*unexpected* thrown error (an RPC/DB call that throws instead of resolving) returns a consistent
`{code, message, recoveryAction}` 503 instead of falling through to Next's generic, unstructured
500. `RpcConfigError` (`infra/rpc/chain-reader.ts`) classifies as `rpc_unavailable`; every other
thrown error classifies as the generic `api_unavailable`.

Wired into `/api/portfolio/[address]` and `/api/nffc/[tokenId]/market` — the two routes that call an
async data-access seam capable of throwing today. **Deliberately not wired** into:

- `/api/nffc/[tokenId]/metadata` — makes no async call yet (its 503 "not available" body is a
  deliberate, already-tested domain state, not an unhandled throw); wrapping it today would be
  inert boilerplate.
- `/api/health`, `/api/ready` — `checkHealth()` is documented to never throw (each dependency probe
  swallows its own error); these are liveness/readiness probes for infrastructure, not user-facing
  error surfaces in the same sense as the other two.

This does **not** touch the deliberate 200/503 "not available yet" bodies these routes already
return for known states (e.g. metadata's `{error: "not_available", reason: ...}` until TASK-21/24
land) — those are tested, intentional response shapes, not the gap this TASK closes.

## Indexer lag — defined, not yet reachable

`indexer_lag` is a complete vocabulary entry, ready to use. No UI path can trigger it today: doing
so would require a live "how far behind is the indexer" signal (a last-indexed-block timestamp
compared against the current chain head), and no such signal exists anywhere in this codebase yet
— every indexed-data read (`portfolio`, `activity`, `/market`) is still fixture-backed pending
TASK-36's real deployment, the same forward-dependency every other read/write surface in this
project already carries. Building that signal is a genuinely new capability (arguably TASK-24's own
follow-up, or TASK-39 Observability's territory), not "unifying an error that already occurs" — so
it is deliberately out of this TASK's scope rather than silently skipped. See KNOWN ISSUES,
`docs/reports/TASK-33-REPORT.md`.

## Testing

`domain/errors/errors.test.ts` (vocabulary completeness/uniqueness), `classify-wallet-error.test.ts`
(the three-way split), `error-notice.test.tsx` (every code renders its message + recovery action),
`error-response.test.ts` (`withApiErrorHandling`'s classification + pass-through). Every one of the
ten write components' existing tests were updated to assert the new unified text instead of the raw
fixture message they used to assert on.
