import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  Field,
  FieldControl,
  FieldError,
  FieldHint,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";

describe("Field", () => {
  it("wires label ↔ control and describes it with the hint", () => {
    render(
      <Field hasHint>
        <FieldLabel>Symbol</FieldLabel>
        <FieldControl>
          <Input />
        </FieldControl>
        <FieldHint>3–6 characters.</FieldHint>
      </Field>,
    );
    const input = screen.getByLabelText("Symbol");
    expect(input).toHaveAccessibleDescription("3–6 characters.");
    expect(input).not.toHaveAttribute("aria-invalid");
  });

  it("marks the control invalid and points aria-describedby at the error", () => {
    render(
      <Field hasError>
        <FieldLabel>Symbol</FieldLabel>
        <FieldControl>
          <Input defaultValue="SEMI" />
        </FieldControl>
        <FieldError>Symbol is already taken.</FieldError>
      </Field>,
    );
    const input = screen.getByLabelText("Symbol");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAccessibleDescription("Symbol is already taken.");
  });
});
