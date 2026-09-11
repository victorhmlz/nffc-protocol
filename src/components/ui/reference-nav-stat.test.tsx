import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ReferenceNavStat } from "@/components/ui/reference-nav-stat";

const NOW = 1_700_000_000_000;

describe("ReferenceNavStat", () => {
  it("shows an explicit loading state, never a blank value", () => {
    render(<ReferenceNavStat data={null} loading />);
    expect(screen.getByText("Reference NAV")).toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("shows an explicit unavailable reason instead of a blank value", () => {
    render(
      <ReferenceNavStat
        data={null}
        unavailableReason="price engine not deployed"
      />,
    );
    expect(screen.getByRole("status")).toHaveTextContent(
      "price engine not deployed",
    );
  });

  it("falls back to a generic unavailable message when no reason is given", () => {
    render(<ReferenceNavStat data={null} />);
    expect(screen.getByRole("status")).toHaveTextContent(/not available yet/i);
  });

  it("labels the value 'Reference NAV' and shows source + age", () => {
    render(
      <ReferenceNavStat
        data={{
          value: 12480.42,
          source: "chainlink:0xfeed",
          observedAt: NOW / 1000 - 120,
          stale: false,
        }}
        now={NOW}
      />,
    );
    expect(screen.getByText("Reference NAV")).toBeInTheDocument();
    expect(screen.getByText("$12,480.42")).toBeInTheDocument();
    expect(screen.getByText("chainlink:0xfeed")).toBeInTheDocument();
    expect(screen.getByText("2m ago")).toBeInTheDocument();
    expect(screen.queryByText("Stale")).not.toBeInTheDocument();
  });

  it("flags stale data with a visible badge", () => {
    render(
      <ReferenceNavStat
        data={{
          value: 100,
          source: "chainlink:0xfeed",
          observedAt: NOW / 1000,
          stale: true,
        }}
        now={NOW}
      />,
    );
    expect(screen.getByText("Stale")).toBeInTheDocument();
  });
});
