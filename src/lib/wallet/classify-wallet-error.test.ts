import { describe, expect, it } from "vitest";
import { classifyWalletError } from "@/lib/wallet/classify-wallet-error";

describe("classifyWalletError", () => {
  it("maps the rejected state to wallet_rejected regardless of message", () => {
    expect(classifyWalletError("rejected", null)).toBe("wallet_rejected");
    expect(classifyWalletError("rejected", "User rejected the request")).toBe("wallet_rejected");
  });

  it("maps a failed state whose message mentions insufficient funds", () => {
    expect(classifyWalletError("failed", "insufficient funds for gas * price + value")).toBe(
      "insufficient_funds",
    );
    expect(classifyWalletError("failed", "Insufficient Funds")).toBe("insufficient_funds");
  });

  it("falls back to transaction_reverted for any other failed message", () => {
    expect(classifyWalletError("failed", "execution reverted: custom error 0x1234")).toBe(
      "transaction_reverted",
    );
    expect(classifyWalletError("failed", null)).toBe("transaction_reverted");
  });
});
