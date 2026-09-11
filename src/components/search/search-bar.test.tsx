import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SearchBar } from "@/components/search/search-bar";

describe("SearchBar", () => {
  it("renders a GET form to /search with a named q input, no client JS required", () => {
    render(<SearchBar />);
    const form = screen.getByRole("search");
    expect(form).toHaveAttribute("action", "/search");
    expect(form).toHaveAttribute("method", "GET");
    expect(screen.getByRole("searchbox", { name: "Search" })).toHaveAttribute("name", "q");
  });

  it("prefills the query from defaultValue", () => {
    render(<SearchBar defaultValue="NVDA" />);
    expect(screen.getByRole("searchbox")).toHaveValue("NVDA");
  });
});
