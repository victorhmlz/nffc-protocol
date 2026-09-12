import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { Representation } from "@domain/registry/types";
import { RepresentationsTable } from "@/components/admin/representations-table";
import { createTestWagmiConfig, WagmiTestProviders } from "../../../tests/support/wagmi-test-config";

const REP: Representation = {
  representationId: "rep:nvda" as never,
  assetId: "asset:nvda" as never,
  providerId: "ROBINHOOD" as never,
  chainId: 4663 as never,
  token: "0x1111111111111111111111111111111111aaaa" as never,
  tokenStandard: "ERC20",
  decimals: 18,
  multiplier: 1,
  oracle: { feed: "0x2222222222222222222222222222222222bbbb" as never, heartbeat: 3600, feedDecimals: 8 },
  status: "ACTIVE",
  createdAt: 0 as never,
  updatedAt: 0 as never,
};

function renderTable(representations: readonly Representation[]) {
  return render(
    <WagmiTestProviders config={createTestWagmiConfig()}>
      <RepresentationsTable representations={representations} />
    </WagmiTestProviders>,
  );
}

describe("RepresentationsTable", () => {
  it("shows an empty-state message when there are no representations", () => {
    renderTable([]);
    expect(screen.getByText(/no representations registered yet/i)).toBeInTheDocument();
  });

  it("lists each representation with its provider and a Deactivate action when active", () => {
    renderTable([REP]);
    expect(screen.getByText("ROBINHOOD")).toBeInTheDocument();
    expect(screen.getByText("0x1111…aaaa")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Deactivate 0x1111…aaaa" })).toBeInTheDocument();
  });
});
