import type { Metadata } from "next";
import { Container } from "@/components/ui";
import { AdminNav } from "@/components/admin/admin-nav";
import { MultisigBanner } from "@/components/admin/multisig-banner";
import { RepresentationsTable } from "@/components/admin/representations-table";
import { RegisterRepresentationForm } from "@/components/admin/register-representation-form";
import { getAssets } from "@/lib/admin/get-assets";
import { getRepresentations } from "@/lib/admin/get-representations";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Admin — Representations" };

export default async function AdminRepresentationsPage() {
  const [assets, representations] = await Promise.all([getAssets(), getRepresentations()]);

  return (
    <Container className="flex flex-col gap-6 py-10">
      <header className="flex flex-col gap-1">
        <h1 className="text-lg font-semibold tracking-tight">Representations</h1>
        <p className="text-sm text-muted-foreground">
          RepresentationRegistry — register, (de)activate, and quote fees for verified on-chain
          tokens.
        </p>
      </header>

      <MultisigBanner />
      <AdminNav />
      <RegisterRepresentationForm assets={assets} />
      <RepresentationsTable representations={representations} />
    </Container>
  );
}
