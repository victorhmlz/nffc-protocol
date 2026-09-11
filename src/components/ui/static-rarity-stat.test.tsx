import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StaticRarityStat } from "@/components/ui/static-rarity-stat";

describe("StaticRarityStat", () => {
  it("labels the stat and renders the score as a 0-100 index", () => {
    render(<StaticRarityStat score={0.4029} />);
    expect(screen.getByText("Static Rarity")).toBeInTheDocument();
    expect(screen.getByText("40")).toBeInTheDocument();
  });

  it("notes the score is structural, not market data", () => {
    render(<StaticRarityStat score={1} />);
    expect(
      screen.getByText(/structural, not market data/i),
    ).toBeInTheDocument();
  });
});
