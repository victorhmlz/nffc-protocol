import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { Portfolio } from "@domain/portfolio/portfolio";
import { PortfolioSummary } from "@/components/portfolio/portfolio-summary";

const OWNER = "0x1111111111111111111111111111111111aaaa";

function portfolio(overrides: Partial<Portfolio> = {}): Portfolio {
  return {
    ownerAddress: OWNER,
    holdings: [],
    totalReferenceValue: 0,
    degraded: false,
    performance: [],
    exposureByAsset: [],
    exposureBySegment: [],
    exposureByCollection: [],
    asOf: 1_800_000_000 as never,
    ...overrides,
  };
}

describe("PortfolioSummary", () => {
  it("shows the total reference value and holding count", () => {
    render(<PortfolioSummary portfolio={portfolio({ totalReferenceValue: 4200, holdings: [{} as never] })} />);
    expect(screen.getByText("Total Reference Value")).toBeInTheDocument();
    expect(screen.getByText("$4,200.00")).toBeInTheDocument();
    expect(screen.getByText("1 NFFC")).toBeInTheDocument();
  });

  it("shows a degraded warning badge only when degraded", () => {
    const { rerender } = render(<PortfolioSummary portfolio={portfolio({ degraded: false })} />);
    expect(screen.queryByText(/stale or unavailable/i)).not.toBeInTheDocument();
    rerender(<PortfolioSummary portfolio={portfolio({ degraded: true })} />);
    expect(screen.getByText(/stale or unavailable/i)).toBeInTheDocument();
  });

  it("shows an explicit unavailable message when there is no performance yet", () => {
    render(<PortfolioSummary portfolio={portfolio({ performance: [] })} />);
    expect(screen.getByText(/not available yet/i)).toBeInTheDocument();
  });

  it("renders each performance window as a percentage with a direction", () => {
    render(
      <PortfolioSummary
        portfolio={portfolio({
          performance: [{ window: "1D", change: 0.042, holdingsIncluded: 2 }],
        })}
      />,
    );
    expect(screen.getByText("1D")).toBeInTheDocument();
    expect(screen.getByText("+4.2%")).toBeInTheDocument();
    expect(screen.getByText("2 holdings")).toBeInTheDocument();
  });
});
