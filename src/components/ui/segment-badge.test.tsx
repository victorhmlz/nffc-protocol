import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  GeoEligibilityNotice,
  SegmentBadge,
} from "@/components/ui/segment-badge";
import { SEGMENT_META } from "@domain/nffc/segment";

describe("SegmentBadge", () => {
  it("labels each segment from SEGMENT_META", () => {
    const { rerender } = render(<SegmentBadge segment="CRYPTO_ONLY" />);
    expect(
      screen.getByText(SEGMENT_META.CRYPTO_ONLY.label),
    ).toBeInTheDocument();
    rerender(<SegmentBadge segment="MIXED" />);
    expect(screen.getByText(SEGMENT_META.MIXED.label)).toBeInTheDocument();
  });
});

describe("GeoEligibilityNotice", () => {
  it("shows the restriction note for STOCK_ONLY and MIXED", () => {
    render(<GeoEligibilityNotice segment="STOCK_ONLY" />);
    const note = screen.getByRole("note");
    expect(note).toHaveTextContent(/not available to US persons/i);
    expect(note).toHaveTextContent(/United Kingdom|UK/i);
  });

  it("shows the not-restricted note for CRYPTO_ONLY", () => {
    render(<GeoEligibilityNotice segment="CRYPTO_ONLY" />);
    expect(screen.getByRole("note")).toHaveTextContent(
      /not subject to the Stock Token geographic restriction/i,
    );
  });
});
