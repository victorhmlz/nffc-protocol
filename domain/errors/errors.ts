/**
 * The unified error vocabulary (TASK-33). Seeded in `docs/spec/07-ux-map.md`
 * §7: "Wallet rejected · insufficient funds · wrong network · reverted
 * transaction · simulation failed · RPC unavailable · indexer lag (data may
 * be behind) · API unavailable · oracle stale. Each maps to one consistent
 * user-facing message and a recovery action."
 *
 * This module is the vocabulary only — a pure, framework-agnostic mapping
 * from a stable {@link ErrorCode} to its message/tone/recovery text. It knows
 * nothing about wagmi, `fetch`, or Postgres — *classifying* a raw wallet
 * error, HTTP response, or RPC exception into one of these codes is
 * necessarily specific to where that raw error comes from, so each classifier
 * lives at its own edge instead (`src/lib/wallet/classify-wallet-error.ts`,
 * `src/lib/api/error-response.ts`, `src/lib/api/classify-fetch-error.ts`) —
 * every one of them imports this module rather than inventing its own copy
 * of the vocabulary, so the actual user-facing words stay identical no
 * matter which layer raised the error.
 */
export type ErrorCode =
  | "wallet_rejected"
  | "insufficient_funds"
  | "wrong_network"
  | "transaction_reverted"
  | "simulation_failed"
  | "rpc_unavailable"
  | "indexer_lag"
  | "api_unavailable"
  | "oracle_stale";

export type ErrorTone = "critical" | "warning";

export interface ErrorVocabularyEntry {
  /** Short, user-facing headline — never a raw exception message. */
  readonly message: string;
  /** One actionable next step, in plain language. */
  readonly recoveryAction: string;
  /**
   * `"warning"` for a condition where the surface still shows data (stale
   * prices, possible indexer lag) — `"critical"` where the action was
   * blocked outright (nothing else to show).
   */
  readonly tone: ErrorTone;
}

export const ERROR_VOCABULARY: Record<ErrorCode, ErrorVocabularyEntry> = {
  wallet_rejected: {
    message: "Wallet request rejected",
    recoveryAction: "You can try again whenever you're ready.",
    tone: "critical",
  },
  insufficient_funds: {
    message: "Insufficient funds",
    recoveryAction: "Add funds to your wallet and try again.",
    tone: "critical",
  },
  wrong_network: {
    message: "Wrong network",
    recoveryAction: "Switch to Robinhood Chain and try again.",
    tone: "warning",
  },
  transaction_reverted: {
    message: "Transaction reverted",
    recoveryAction: "The transaction did not go through. Check the details and try again.",
    tone: "critical",
  },
  simulation_failed: {
    message: "This action can't be completed right now",
    recoveryAction: "Try again shortly.",
    tone: "critical",
  },
  rpc_unavailable: {
    message: "Network connection unavailable",
    recoveryAction: "The blockchain connection is temporarily unavailable. Try again shortly.",
    tone: "critical",
  },
  indexer_lag: {
    message: "Data may be behind",
    recoveryAction: "Recently confirmed activity can take a few moments to appear here.",
    tone: "warning",
  },
  api_unavailable: {
    message: "Service unavailable",
    recoveryAction: "This service is temporarily unavailable. Try again shortly.",
    tone: "critical",
  },
  oracle_stale: {
    message: "Some prices are stale",
    recoveryAction: "Figures may be degraded until fresh oracle data is available.",
    tone: "warning",
  },
};
