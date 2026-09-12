import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { StatusToggleButton } from "@/components/admin/status-toggle-button";
import { createTestWagmiConfig, WagmiTestProviders } from "../../../tests/support/wagmi-test-config";

function renderButton(isActive: boolean) {
  const simulate = vi.fn().mockRejectedValue(new Error("Registry is not deployed yet (TASK-36)."));
  const buildCall = vi.fn();
  render(
    <WagmiTestProviders config={createTestWagmiConfig()}>
      <StatusToggleButton label="NVDA" isActive={isActive} simulate={simulate} buildCall={buildCall} />
    </WagmiTestProviders>,
  );
  return { simulate, buildCall };
}

describe("StatusToggleButton", () => {
  it("shows Deactivate for an active entry", () => {
    renderButton(true);
    expect(screen.getByRole("button", { name: "Deactivate NVDA" })).toBeInTheDocument();
  });

  it("shows Activate for an inactive entry", () => {
    renderButton(false);
    expect(screen.getByRole("button", { name: "Activate NVDA" })).toBeInTheDocument();
  });

  it("surfaces the simulation error without ever building the call", async () => {
    const { buildCall } = renderButton(true);
    fireEvent.click(screen.getByRole("button", { name: "Deactivate NVDA" }));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent(/not deployed yet/i));
    expect(buildCall).not.toHaveBeenCalled();
  });
});
