import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { StaticComponentFact } from "@domain/metadata/metadata";
import { CompositionTable } from "@/components/ui/composition-table";

function comp(
  overrides: Partial<StaticComponentFact> & { position: number },
): StaticComponentFact {
  return {
    assetId: "0xasset" as never,
    assetSymbol: "NVDA",
    assetClass: "EQUITY",
    providerId: "ROBINHOOD" as never,
    representationId: `0xrep${overrides.position}` as never,
    weightBps: 6000 as never,
    ...overrides,
  };
}

describe("CompositionTable", () => {
  it("shows an explicit loading placeholder, never a blank table", () => {
    const { container } = render(
      <CompositionTable components={null} loading />,
    );
    expect(container.querySelector('[aria-busy="true"]')).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("renders each component's asset, class, provider, and weight percentage", () => {
    render(
      <CompositionTable
        components={[
          comp({
            position: 0,
            assetSymbol: "NVDA",
            assetClass: "EQUITY",
            providerId: "ROBINHOOD" as never,
            weightBps: 6000 as never,
          }),
          comp({
            position: 1,
            assetSymbol: "BTC",
            assetClass: "CRYPTO",
            providerId: "CRYPTO_NATIVE" as never,
            weightBps: 4000 as never,
          }),
        ]}
      />,
    );
    expect(screen.getByText("NVDA")).toBeInTheDocument();
    expect(screen.getByText("EQUITY")).toBeInTheDocument();
    expect(screen.getByText("ROBINHOOD")).toBeInTheDocument();
    expect(screen.getByText("60.00%")).toBeInTheDocument();
    expect(screen.getByText("BTC")).toBeInTheDocument();
    expect(screen.getByText("40.00%")).toBeInTheDocument();
  });
});
