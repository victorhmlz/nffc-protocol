import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { WalletResultsList } from "@/components/search/wallet-results-list";

const ADDRESS = "0x1111111111111111111111111111111111aaaa";

describe("WalletResultsList", () => {
  it("shows an empty-state message when there are no matches", () => {
    render(<WalletResultsList wallets={[]} />);
    expect(screen.getByText(/no matching wallets/i)).toBeInTheDocument();
  });

  it("links each wallet to its profile with created/owned counts", () => {
    render(<WalletResultsList wallets={[{ address: ADDRESS, createdCount: 2, ownedCount: 1 }]} />);
    const link = screen.getByRole("link", { name: /0x1111…aaaa/i });
    expect(link).toHaveAttribute("href", `/profile/${ADDRESS}`);
    expect(screen.getByText("2 created · 1 owned")).toBeInTheDocument();
  });
});
