import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { AssetIdentity } from "@domain/registry/types";
import { AssetsTable } from "@/components/admin/assets-table";
import { createTestWagmiConfig, WagmiTestProviders } from "../../../tests/support/wagmi-test-config";

const ASSET: AssetIdentity = {
  assetId: "asset:nvda" as never,
  symbol: "NVDA",
  name: "NVIDIA Corporation",
  assetClass: "EQUITY",
  status: "ACTIVE",
};

function renderTable(assets: readonly AssetIdentity[]) {
  return render(
    <WagmiTestProviders config={createTestWagmiConfig()}>
      <AssetsTable assets={assets} />
    </WagmiTestProviders>,
  );
}

describe("AssetsTable", () => {
  it("shows an empty-state message when there are no assets", () => {
    renderTable([]);
    expect(screen.getByText(/no assets registered yet/i)).toBeInTheDocument();
  });

  it("lists each asset with a Deactivate action when active", () => {
    renderTable([ASSET]);
    expect(screen.getByText("NVDA")).toBeInTheDocument();
    expect(screen.getByText("NVIDIA Corporation")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Deactivate NVDA" })).toBeInTheDocument();
  });

  it("shows an Activate action for an inactive asset", () => {
    renderTable([{ ...ASSET, status: "INACTIVE" }]);
    expect(screen.getByRole("button", { name: "Activate NVDA" })).toBeInTheDocument();
  });
});
