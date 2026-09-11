import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { OwnershipCard } from "@/components/nffc/ownership-card";

describe("OwnershipCard", () => {
  it("shows the owner, creator, and the freshness block for a representative record", () => {
    render(
      <OwnershipCard
        ownerAddress="0x1111111111111111111111111111111111aaaa"
        creatorAddress="0x2222222222222222222222222222222222bbbb"
        ownerLastSyncedBlock={1_234_567}
      />,
    );
    expect(screen.getByText("0x1111…aaaa")).toBeInTheDocument();
    expect(screen.getByText("0x2222…bbbb")).toBeInTheDocument();
    expect(screen.getByText(/block 1234567/i)).toBeInTheDocument();
  });
});
