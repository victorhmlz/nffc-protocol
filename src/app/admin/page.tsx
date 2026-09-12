import type { Metadata } from "next";
import { checkHealth } from "@infra/health";
import { Container } from "@/components/ui";
import { AdminNav } from "@/components/admin/admin-nav";
import { MultisigBanner } from "@/components/admin/multisig-banner";
import { HealthSummary } from "@/components/admin/health-summary";
import { ProtocolReportPanel } from "@/components/admin/protocol-report-panel";
import { getProtocolReport } from "@/lib/admin/get-protocol-report";

// Server-rendered on every request — admin data is neither cached nor
// stale-tolerant the way public marketplace pages are (`docs/admin.md`).
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Admin",
  description: "Assets, representations, fees, collections, reports, and system health.",
};

export default async function AdminPage() {
  const [health, report] = await Promise.all([checkHealth(), getProtocolReport()]);

  return (
    <Container className="flex flex-col gap-6 py-10">
      <header className="flex flex-col gap-1">
        <h1 className="text-lg font-semibold tracking-tight">Admin</h1>
        <p className="text-sm text-muted-foreground">
          Assets, representations, fees, collections, reports, and system health.
        </p>
      </header>

      <MultisigBanner />
      <AdminNav />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <HealthSummary report={health} />
        <ProtocolReportPanel report={report} />
      </div>
    </Container>
  );
}
