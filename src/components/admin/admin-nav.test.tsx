import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AdminNav } from "@/components/admin/admin-nav";

describe("AdminNav", () => {
  it("links to every admin section", () => {
    render(<AdminNav />);
    for (const [name, href] of [
      ["Dashboard", "/admin"],
      ["Assets", "/admin/assets"],
      ["Representations", "/admin/representations"],
      ["Fees", "/admin/fees"],
      ["Collections", "/admin/collections"],
      ["Reports", "/admin/reports"],
    ]) {
      expect(screen.getByRole("link", { name })).toHaveAttribute("href", href);
    }
  });
});
