import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { ProtocolReport } from "@domain/admin/admin";
import { ProtocolReportPanel } from "@/components/admin/protocol-report-panel";

function report(overrides: Partial<ProtocolReport> = {}): ProtocolReport {
  return {
    totalNffcs: 5,
    totalCollections: 2,
    segmentCounts: { CRYPTO_ONLY: 3, MIXED: 2 },
    activeListingCount: 2,
    totalSaleVolumeWei: "1000000000000000000",
    saleCount: 1,
    ...overrides,
  };
}

describe("ProtocolReportPanel", () => {
  it("shows the headline counts and total sale volume", () => {
    render(<ProtocolReportPanel report={report()} />);
    expect(screen.getByText("NFFCs")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.getByText("1 ETH")).toBeInTheDocument();
  });

  it("shows a per-segment breakdown when present", () => {
    render(<ProtocolReportPanel report={report()} />);
    expect(screen.getByText(/CRYPTO_ONLY:/)).toBeInTheDocument();
  });

  it("omits the segment breakdown section when there are no NFFCs", () => {
    render(<ProtocolReportPanel report={report({ segmentCounts: {} })} />);
    expect(screen.queryByText("By segment")).not.toBeInTheDocument();
  });
});
