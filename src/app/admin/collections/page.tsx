import type { Metadata } from "next";
import { Container } from "@/components/ui";
import { AdminNav } from "@/components/admin/admin-nav";
import { MultisigBanner } from "@/components/admin/multisig-banner";
import { CollectionsTable } from "@/components/admin/collections-table";
import { getAllCollections } from "@/lib/admin/get-collections";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Admin — Collections" };

export default async function AdminCollectionsPage() {
  const collections = await getAllCollections();

  return (
    <Container className="flex flex-col gap-6 py-10">
      <header className="flex flex-col gap-1">
        <h1 className="text-lg font-semibold tracking-tight">Collections</h1>
        <p className="text-sm text-muted-foreground">
          Every collection with at least one indexed NFFC, protocol-wide.
        </p>
      </header>

      <MultisigBanner />
      <AdminNav />
      <CollectionsTable collections={collections} />
    </Container>
  );
}
