/**
 * Maps a wallet/blockchain write failure onto the shared {@link ErrorCode}
 * vocabulary (TASK-33). Deliberately does **not** re-derive "was this
 * rejected in the wallet" from parsing an error message — `transaction-
 * flow.ts` already computes that distinction into `TransactionState`
 * (`"rejected"` vs `"failed"`) via the exact same regex TASK-16 established
 * (`/user rejected|user denied/i`), so this classifier trusts that state
 * instead of re-parsing the message a second time. The one thing it still
 * inspects the message for is the `"failed"` state's one further split this
 * codebase didn't need before now: insufficient funds vs. every other
 * revert/failure.
 */
import type { TransactionState } from "@/lib/wallet/transaction-state";
import type { ErrorCode } from "@domain/errors/errors";

const INSUFFICIENT_FUNDS = /insufficient funds/i;

/**
 * `state`/`message` are the tail of a write flow that ended in `"rejected"`
 * or `"failed"` — call this only once one of those two terminal states is
 * reached (mirrors `TRANSACTION_STATE_META`'s own "terminal" states).
 */
export function classifyWalletError(
  state: Extract<TransactionState, "rejected" | "failed">,
  message: string | null,
): ErrorCode {
  if (state === "rejected") return "wallet_rejected";
  if (message && INSUFFICIENT_FUNDS.test(message)) return "insufficient_funds";
  return "transaction_reverted";
}
