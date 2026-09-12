import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { HealthReport } from "@infra/health";
import { HealthSummary } from "@/components/admin/health-summary";

describe("HealthSummary", () => {
  it("shows the overall status and each dependency's status", () => {
    const report: HealthReport = {
      status: "degraded",
      env: "test",
      checks: { database: "down", redis: "not_configured", rpc: "ok" },
    };
    render(<HealthSummary report={report} />);
    expect(screen.getByText("degraded")).toBeInTheDocument();
    expect(screen.getByText("env: test")).toBeInTheDocument();
    expect(screen.getByText("down")).toBeInTheDocument();
    expect(screen.getByText("not_configured")).toBeInTheDocument();
    expect(screen.getByText("ok")).toBeInTheDocument();
  });
});
