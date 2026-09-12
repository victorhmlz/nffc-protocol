import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MultisigBanner } from "@/components/admin/multisig-banner";

describe("MultisigBanner", () => {
  it("states the multisig requirement explicitly", () => {
    render(<MultisigBanner />);
    expect(screen.getByRole("note")).toHaveTextContent(/multisig/i);
    expect(screen.getByRole("note")).toHaveTextContent(/never a single key/i);
  });
});
