import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import PortfolioPage from "@/app/portfolio/page";
import {
  createTestWagmiConfig,
  MOCK_ACCOUNT,
  WagmiTestProviders,
} from "../../../tests/support/wagmi-test-config";

function renderPage() {
  return render(
    <WagmiTestProviders config={createTestWagmiConfig()}>
      <PortfolioPage />
    </WagmiTestProviders>,
  );
}

describe("PortfolioPage", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            ownerAddress: MOCK_ACCOUNT,
            holdings: [],
            totalReferenceValue: 0,
            degraded: false,
            performance: [],
            exposureByAsset: [],
            exposureBySegment: [],
            exposureByCollection: [],
            asOf: 1_800_000_000,
          }),
          { status: 200 },
        ),
      ),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("prompts to connect a wallet when none is connected", () => {
    renderPage();
    expect(screen.getByText(/connect a wallet to view its portfolio/i)).toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("fetches and renders the connected wallet's portfolio", async () => {
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: /connect mock connector/i }));

    await waitFor(() => expect(screen.getByText("Total Reference Value")).toBeInTheDocument());
    expect(fetch).toHaveBeenCalledWith(`/api/portfolio/${MOCK_ACCOUNT}`);
    expect(screen.getByText(/doesn.t hold any NFFCs/i)).toBeInTheDocument();
  });
});
