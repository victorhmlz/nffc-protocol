import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TransactionStatus } from "@/components/ui/transaction-status";
import { TRANSACTION_STATE_META } from "@/lib/wallet/transaction-state";

describe("TransactionStatus", () => {
  it("renders label + description as a polite live status", () => {
    render(<TransactionStatus state="confirming" />);
    const region = screen.getByRole("status");
    expect(region).toHaveAttribute("aria-live", "polite");
    expect(
      screen.getByText(TRANSACTION_STATE_META.confirming.label),
    ).toBeInTheDocument();
    expect(
      screen.getByText(TRANSACTION_STATE_META.confirming.description),
    ).toBeInTheDocument();
  });

  it("does not rely on colour alone — text label is always present", () => {
    render(<TransactionStatus state="failed" />);
    expect(screen.getByText(TRANSACTION_STATE_META.failed.label)).toBeVisible();
  });
});
