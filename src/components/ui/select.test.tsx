import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Select } from "@/components/ui/select";

describe("Select", () => {
  it("renders a native select with its options and the given value selected", () => {
    render(
      <Select aria-label="Example" defaultValue="b">
        <option value="a">A</option>
        <option value="b">B</option>
      </Select>,
    );
    expect(screen.getByRole("combobox", { name: "Example" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "A" })).toBeInTheDocument();
    expect((screen.getByRole("option", { name: "B" }) as HTMLOptionElement).selected).toBe(true);
  });
});
