import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MintConditionCard } from "@/components/nffc/mint-condition-card";

describe("MintConditionCard", () => {
  it("renders every field of the trait record", () => {
    render(
      <MintConditionCard
        trait={{
          Regime: "near-highs",
          "Weighted Drawdown (bps)": 500,
          "Components At Highs": 2,
          "Minted At Block": 1_000_000,
        }}
      />,
    );
    expect(screen.getByText("near-highs")).toBeInTheDocument();
    expect(screen.getByText("500")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("1000000")).toBeInTheDocument();
  });

  it("shows an explicit unavailable state for a null trait, not a blank card", () => {
    render(<MintConditionCard trait={null} />);
    expect(screen.getByText(/not available/i)).toBeInTheDocument();
  });
});
