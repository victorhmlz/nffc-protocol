import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Home from "./page";

describe("bootstrap smoke test", () => {
  it("renders the home page heading (proves Vitest + RTL + jsdom + @/ alias are wired)", () => {
    render(<Home />);
    expect(
      screen.getByRole("heading", { level: 1, name: "NFFC Protocol" }),
    ).toBeInTheDocument();
  });

  it("runs plain assertions", () => {
    expect(1 + 1).toBe(2);
  });
});
