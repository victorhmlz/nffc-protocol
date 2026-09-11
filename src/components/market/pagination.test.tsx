import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Pagination } from "@/components/market/pagination";

describe("Pagination", () => {
  it("renders nothing when everything fits on one page", () => {
    const { container } = render(
      <Pagination page={1} pageSize={24} total={10} buildHref={(p) => `/market?page=${p}`} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("builds Previous/Next hrefs via buildHref, preserving other query params", () => {
    render(
      <Pagination page={2} pageSize={10} total={35} buildHref={(p) => `/market?sort=newest&page=${p}`} />,
    );
    expect(screen.getByRole("link", { name: /previous/i })).toHaveAttribute(
      "href",
      "/market?sort=newest&page=1",
    );
    expect(screen.getByRole("link", { name: /next/i })).toHaveAttribute(
      "href",
      "/market?sort=newest&page=3",
    );
    expect(screen.getByText("Page 2 of 4")).toBeInTheDocument();
  });

  it("renders a real disabled button (not a still-clickable link) for Previous on the first page", () => {
    render(<Pagination page={1} pageSize={10} total={35} buildHref={(p) => `/market?page=${p}`} />);
    expect(screen.getByRole("button", { name: /previous/i })).toBeDisabled();
    expect(screen.getByRole("link", { name: /next/i })).toHaveAttribute("href", "/market?page=2");
  });

  it("renders a real disabled button for Next on the last page", () => {
    render(<Pagination page={4} pageSize={10} total={35} buildHref={(p) => `/market?page=${p}`} />);
    expect(screen.getByRole("button", { name: /next/i })).toBeDisabled();
    expect(screen.getByRole("link", { name: /previous/i })).toHaveAttribute("href", "/market?page=3");
  });
});
