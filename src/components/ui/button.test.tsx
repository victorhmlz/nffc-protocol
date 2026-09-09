import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Button } from "@/components/ui/button";

describe("Button", () => {
  it("renders a button with type=button by default", () => {
    render(<Button>Mint</Button>);
    const btn = screen.getByRole("button", { name: "Mint" });
    expect(btn).toHaveAttribute("type", "button");
  });

  it("applies variant + size classes from tokens", () => {
    render(
      <Button variant="destructive" size="sm">
        Cancel
      </Button>,
    );
    const btn = screen.getByRole("button", { name: "Cancel" });
    expect(btn.className).toContain("bg-loss");
    expect(btn.className).toContain("h-8");
  });

  it("renders as the child element when asChild is set", () => {
    render(
      <Button asChild>
        <a href="/x">Explorer</a>
      </Button>,
    );
    const link = screen.getByRole("link", { name: "Explorer" });
    expect(link).toHaveAttribute("href", "/x");
    expect(screen.queryByRole("button")).toBeNull();
  });
});
