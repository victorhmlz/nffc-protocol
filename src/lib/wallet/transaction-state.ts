/**
 * The wallet transaction state machine from `docs/spec/07-ux-map.md` §3:
 *
 *   IDLE → AWAITING_WALLET → SIGNING → SUBMITTED → CONFIRMING
 *                                                    → SUCCESS | FAILED | REJECTED
 *
 * No state is skipped; SUCCESS is only ever reached after on-chain confirmation.
 * This module is the shared vocabulary; the machine's transitions and the wallet
 * integration are TASK-16.
 */
export type TransactionState =
  | "idle"
  | "awaiting_wallet"
  | "signing"
  | "submitted"
  | "confirming"
  | "success"
  | "failed"
  | "rejected";

export type TransactionTone = "idle" | "pending" | "good" | "critical";

export interface TransactionStateMeta {
  readonly label: string;
  readonly description: string;
  readonly tone: TransactionTone;
  readonly terminal: boolean;
}

export const TRANSACTION_STATE_META: Record<
  TransactionState,
  TransactionStateMeta
> = {
  idle: {
    label: "Ready",
    description: "No transaction in progress.",
    tone: "idle",
    terminal: false,
  },
  awaiting_wallet: {
    label: "Waiting for wallet",
    description: "Open your wallet to review the request.",
    tone: "pending",
    terminal: false,
  },
  signing: {
    label: "Awaiting signature",
    description: "Approve the transaction in your wallet.",
    tone: "pending",
    terminal: false,
  },
  submitted: {
    label: "Submitted",
    description: "Broadcast to the network. Waiting to be picked up.",
    tone: "pending",
    terminal: false,
  },
  confirming: {
    label: "Confirming",
    description: "Included in a block. Waiting for confirmations.",
    tone: "pending",
    terminal: false,
  },
  success: {
    label: "Confirmed",
    description: "The transaction is confirmed on-chain.",
    tone: "good",
    terminal: true,
  },
  failed: {
    label: "Failed",
    description: "The transaction reverted or could not be processed.",
    tone: "critical",
    terminal: true,
  },
  rejected: {
    label: "Rejected",
    description: "The request was declined in the wallet.",
    tone: "critical",
    terminal: true,
  },
};

export function isTerminal(state: TransactionState): boolean {
  return TRANSACTION_STATE_META[state].terminal;
}
