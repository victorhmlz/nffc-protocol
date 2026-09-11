import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { NffcMarketSnapshot } from "@domain/metadata/metadata";
import { NffcMarketPanel } from "@/components/ui/nffc-market-panel";

const NOW = 1_700_000_000_000;

function snapshot(
  overrides: Partial<NffcMarketSnapshot> = {},
): NffcMarketSnapshot {
  return {
    tokenId: "1",
    referenceNav: null,
    components: [],
    performance: [],
    asOf: NOW / 1000,
    degraded: false,
    ...overrides,
  };
}

describe("NffcMarketPanel", () => {
  it("shows an explicit loading state", () => {
    const { container } = render(<NffcMarketPanel snapshot={null} loading />);
    expect(container.querySelector('[aria-busy="true"]')).toBeInTheDocument();
  });

  it("surfaces the unavailable reason from the snapshot, never a blank panel", () => {
    render(
      <NffcMarketPanel
        snapshot={snapshot({ unavailableReason: "price engine not deployed" })}
      />,
    );
    expect(screen.getByText("price engine not deployed")).toBeInTheDocument();
    expect(screen.getByText(/not available yet/i)).toBeInTheDocument(); // performance windows
  });

  it("renders the reference NAV and performance windows when present", () => {
    render(
      <NffcMarketPanel
        snapshot={snapshot({
          referenceNav: {
            value: 100,
            source: "chainlink:0xfeed",
            observedAt: NOW / 1000,
            stale: false,
          },
        })}
        now={NOW}
      />,
    );
    expect(screen.getByText("Reference NAV")).toBeInTheDocument();
    expect(screen.getByText("$100.00")).toBeInTheDocument();
  });

  it("flags a degraded snapshot with a visible warning badge", () => {
    render(
      <NffcMarketPanel
        snapshot={snapshot({
          referenceNav: {
            value: 100,
            source: "chainlink:0xfeed",
            observedAt: NOW / 1000,
            stale: true,
          },
          degraded: true,
        })}
        now={NOW}
      />,
    );
    expect(
      screen.getByText(/stale — figures may be degraded/i),
    ).toBeInTheDocument();
  });
});
