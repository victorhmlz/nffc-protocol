import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CollectionsTable } from "@/components/admin/collections-table";

const ADDRESS = "0x1111111111111111111111111111111111aaaa";

describe("CollectionsTable", () => {
  it("shows an empty-state message when there are no collections", () => {
    render(<CollectionsTable collections={[]} />);
    expect(screen.getByText(/no collections indexed yet/i)).toBeInTheDocument();
  });

  it("lists each collection with its creator linked to their profile", () => {
    render(
      <CollectionsTable
        collections={[{ collectionId: "1", collectionName: "Blue Chips", creatorAddress: ADDRESS, nffcCount: 3 }]}
      />,
    );
    expect(screen.getByText("Blue Chips")).toBeInTheDocument();
    const link = screen.getByRole("link", { name: /0x1111…aaaa/i });
    expect(link).toHaveAttribute("href", `/profile/${ADDRESS}`);
    expect(screen.getByText("3")).toBeInTheDocument();
  });
});
