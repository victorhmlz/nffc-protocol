import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ExposureBreakdown } from "@/components/portfolio/exposure-breakdown";

describe("ExposureBreakdown", () => {
  it("shows the empty-state message when there are no rows", () => {
    render(<ExposureBreakdown title="Exposure by asset" rows={[]} emptyLabel="No priced holdings yet." />);
    expect(screen.getByText("Exposure by asset")).toBeInTheDocument();
    expect(screen.getByText("No priced holdings yet.")).toBeInTheDocument();
  });

  it("renders each row's label, value, and percentage", () => {
    render(
      <ExposureBreakdown
        title="Exposure by segment"
        rows={[{ key: "CRYPTO_ONLY", label: "Crypto-only", value: 1500, weightOfPortfolio: 0.5 }]}
        emptyLabel="none"
      />,
    );
    expect(screen.getByText("Crypto-only")).toBeInTheDocument();
    expect(screen.getByText(/\$1,500\.00/)).toBeInTheDocument();
    expect(screen.getByText(/50\.0%/)).toBeInTheDocument();
  });

  it("renders an optional sublabel alongside the label", () => {
    render(
      <ExposureBreakdown
        title="Exposure by collection"
        rows={[{ key: "1", label: "Blue Chips", sublabel: "(2)", value: 1000, weightOfPortfolio: 1 }]}
        emptyLabel="none"
      />,
    );
    expect(screen.getByText("(2)")).toBeInTheDocument();
  });
});
