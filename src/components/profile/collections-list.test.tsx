import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CollectionsList } from "@/components/profile/collections-list";

describe("CollectionsList", () => {
  it("shows an empty-state message when the wallet has created no collections", () => {
    render(<CollectionsList collections={[]} />);
    expect(screen.getByText(/hasn.t created a collection yet/i)).toBeInTheDocument();
  });

  it("lists each collection with its NFFC count, linked to /collection/[id]", () => {
    render(
      <CollectionsList
        collections={[{ collectionId: "1", collectionName: "Blue Chips", nffcCount: 3 }]}
      />,
    );
    const link = screen.getByRole("link", { name: "Blue Chips" });
    expect(link).toHaveAttribute("href", "/collection/1");
    expect(screen.getByText("3 NFFCs")).toBeInTheDocument();
  });

  it("uses singular NFFC for a count of one", () => {
    render(
      <CollectionsList
        collections={[{ collectionId: "1", collectionName: "Solo", nffcCount: 1 }]}
      />,
    );
    expect(screen.getByText("1 NFFC")).toBeInTheDocument();
  });

  it("accepts a custom empty-state label (TASK-28's /search reuse)", () => {
    render(<CollectionsList collections={[]} emptyLabel="No matching collections." />);
    expect(screen.getByText("No matching collections.")).toBeInTheDocument();
  });
});
