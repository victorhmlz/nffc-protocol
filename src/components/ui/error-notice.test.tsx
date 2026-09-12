import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ERROR_VOCABULARY, type ErrorCode } from "@domain/errors/errors";
import { ErrorNotice } from "@/components/ui/error-notice";

describe("ErrorNotice", () => {
  it("renders the vocabulary message and recovery action for every code", () => {
    for (const code of Object.keys(ERROR_VOCABULARY) as ErrorCode[]) {
      const { unmount } = render(<ErrorNotice code={code} />);
      const entry = ERROR_VOCABULARY[code];
      expect(screen.getByText(entry.message)).toBeInTheDocument();
      expect(screen.getByText(entry.recoveryAction)).toBeInTheDocument();
      unmount();
    }
  });

  it("is announced as an alert", () => {
    render(<ErrorNotice code="wallet_rejected" />);
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });
});
