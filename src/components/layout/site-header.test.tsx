import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  usePathname: () => "/market",
}));

import { SiteHeader } from "@/components/layout/site-header";
import { createTestWagmiConfig, WagmiTestProviders } from "../../../tests/support/wagmi-test-config";

function renderHeader() {
  return render(
    <WagmiTestProviders config={createTestWagmiConfig()}>
      <SiteHeader />
    </WagmiTestProviders>,
  );
}

/**
 * TASK-35 (`docs/OPEN_ISSUES.md` Issue #13): the one persistent chrome
 * covering navigation between top-level surfaces plus the three
 * wallet-related widgets (`NetworkBanner`/`ThemeToggle`/
 * `ConnectWalletButton`) that used to be reachable from only one or two
 * pages each.
 */
describe("SiteHeader", () => {
  it("links to every top-level surface", () => {
    renderHeader();
    for (const label of ["Market", "Portfolio", "Activity", "Search", "Create"]) {
      expect(screen.getByRole("link", { name: label })).toBeInTheDocument();
    }
  });

  it("marks the current route active", () => {
    renderHeader();
    expect(screen.getByRole("link", { name: "Market" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  it("renders the theme toggle and wallet connect controls", () => {
    renderHeader();
    expect(screen.getByRole("button", { name: /activate for/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /connect/i })).toBeInTheDocument();
  });

  it("renders nothing from NetworkBanner when no wallet is connected", () => {
    renderHeader();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
