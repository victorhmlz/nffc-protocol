import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { ActivityEntry } from "@domain/nffc-detail/detail";
import { ActivityTimeline } from "@/components/nffc/activity-timeline";

const MINT: ActivityEntry = {
  id: "1",
  kind: "MINT",
  tokenId: "1",
  actorAddress: "0x1111111111111111111111111111111111aaaa",
  counterpartyAddress: null,
  amountWei: null,
  blockNumber: 1_000_000,
  txHash: "0xabc",
  occurredAt: "2026-01-01T00:00:00.000Z",
};

const SALE: ActivityEntry = {
  id: "2",
  kind: "SALE",
  tokenId: "1",
  actorAddress: "0x1111111111111111111111111111111111aaaa",
  counterpartyAddress: "0x2222222222222222222222222222222222bbbb",
  amountWei: "2000000000000000000",
  blockNumber: 1_000_500,
  txHash: "0xdef",
  occurredAt: "2026-01-05T00:00:00.000Z",
};

describe("ActivityTimeline", () => {
  it("shows an empty state, not a blank list, when there is no activity", () => {
    render(<ActivityTimeline activity={[]} />);
    expect(screen.getByText(/no activity yet/i)).toBeInTheDocument();
  });

  it("renders each entry's kind, counterparty, amount, block, and tx hash (traceability)", () => {
    render(<ActivityTimeline activity={[SALE, MINT]} />);
    expect(screen.getByText("Sold")).toBeInTheDocument();
    expect(screen.getByText("Minted")).toBeInTheDocument();
    expect(screen.getByText("2 ETH")).toBeInTheDocument();
    expect(screen.getByText(/block 1000500/i)).toBeInTheDocument();
    expect(screen.getByTitle("0xdef")).toBeInTheDocument();
  });

  it("shows no amount for a non-value event like MINT", () => {
    render(<ActivityTimeline activity={[MINT]} />);
    expect(screen.queryByText(/eth$/i)).not.toBeInTheDocument();
  });

  it("does not show a per-token link by default (the per-NFFC page already implies the token)", () => {
    render(<ActivityTimeline activity={[MINT]} />);
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("links each entry to its NFFC when showTokenLinks is set (TASK-26's global feed)", () => {
    render(<ActivityTimeline activity={[MINT]} showTokenLinks />);
    expect(screen.getByRole("link", { name: /nffc #1/i })).toHaveAttribute("href", "/nffc/1");
  });

  it("accepts a custom title", () => {
    render(<ActivityTimeline activity={[]} title="Recent activity" />);
    expect(screen.getByText("Recent activity")).toBeInTheDocument();
  });
});
