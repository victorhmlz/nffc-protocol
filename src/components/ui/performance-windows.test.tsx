import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { NavPoint, PerformancePoint } from "@domain/valuation/types";
import { PerformanceWindows } from "@/components/ui/performance-windows";

const NOW = 1_700_000_000_000;

function nav(value: number, at: number): NavPoint {
  return { tokenId: "1" as never, value, at: at as never, degraded: false };
}

function point(
  window: PerformancePoint["window"],
  change: number,
  at: number,
): PerformancePoint {
  return { window, change, from: nav(0, at), to: nav(100, at) };
}

describe("PerformanceWindows", () => {
  it("shows an explicit loading state, never a blank grid", () => {
    const { container } = render(<PerformanceWindows points={null} loading />);
    expect(container.querySelector('[aria-busy="true"]')).toBeInTheDocument();
    expect(
      container.querySelectorAll('[aria-hidden="true"]').length,
    ).toBeGreaterThan(0);
  });

  it("shows an explicit unavailable message for null or empty data, never a blank grid", () => {
    render(<PerformanceWindows points={null} />);
    expect(screen.getByRole("status")).toHaveTextContent(/not available yet/i);

    render(<PerformanceWindows points={[]} />);
    expect(screen.getAllByRole("status")[0]).toHaveTextContent(
      /not available yet/i,
    );
  });

  it("renders every window with a signed percentage and its provenance age", () => {
    render(
      <PerformanceWindows
        points={[
          point("1D", 0.042, NOW / 1000 - 60),
          point("7D", -0.061, NOW / 1000 - 60),
          point("30D", 0, NOW / 1000 - 60),
          point("SINCE_MINT", 0.5, NOW / 1000 - 60),
        ]}
        now={NOW}
      />,
    );
    expect(screen.getByText("1D")).toBeInTheDocument();
    expect(screen.getByText("+4.2%")).toBeInTheDocument();
    expect(screen.getByText("7D")).toBeInTheDocument();
    expect(screen.getByText("-6.1%")).toBeInTheDocument();
    expect(screen.getByText("Since mint")).toBeInTheDocument();
    expect(screen.getAllByText("1m ago").length).toBe(4);
  });
});
