import type { Metadata } from "next";
import { Container } from "@/components/ui";
import { AdminNav } from "@/components/admin/admin-nav";
import { MultisigBanner } from "@/components/admin/multisig-banner";
import { ProtocolReportPanel } from "@/components/admin/protocol-report-panel";
import { getProtocolReport } from "@/lib/admin/get-protocol-report";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Admin — Reports" };

export default async function AdminReportsPage() {
  const report = await getProtocolReport();

  return (
    <Container className="flex flex-col gap-6 py-10">
      <header className="flex flex-col gap-1">
        <h1 className="text-lg font-semibold tracking-tight">Reports</h1>
        <p className="text-sm text-muted-foreground">
          A pure aggregation over the same indexed data every other read surface in this codebase
          already composes.
        </p>
      </header>

      <MultisigBanner />
      <AdminNav />
      <ProtocolReportPanel report={report} />
    </Container>
  );
}
