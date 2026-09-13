import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

let currentPathname = "/market";

vi.mock("next/navigation", () => ({
  usePathname: () => currentPathname,
}));

import { NavLink } from "@/components/layout/nav-link";

describe("NavLink", () => {
  it("marks the current route with aria-current=page", () => {
    currentPathname = "/market";
    render(<NavLink href="/market" label="Market" />);
    expect(screen.getByRole("link", { name: "Market" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  it("does not mark a different route as current", () => {
    currentPathname = "/portfolio";
    render(<NavLink href="/market" label="Market" />);
    expect(screen.getByRole("link", { name: "Market" })).not.toHaveAttribute("aria-current");
  });
});
