import type { Metadata } from "next";
import { Container } from "@/components/ui";
import { AdminNav } from "@/components/admin/admin-nav";
import { MultisigBanner } from "@/components/admin/multisig-banner";
import { AssetsTable } from "@/components/admin/assets-table";
import { RegisterAssetForm } from "@/components/admin/register-asset-form";
import { getAssets } from "@/lib/admin/get-assets";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Admin — Assets" };

export default async function AdminAssetsPage() {
  const assets = await getAssets();

  return (
    <Container className="flex flex-col gap-6 py-10">
      <header className="flex flex-col gap-1">
        <h1 className="text-lg font-semibold tracking-tight">Assets</h1>
        <p className="text-sm text-muted-foreground">
          AssetIdentityRegistry — register and (de)activate asset identities.
        </p>
      </header>

      <MultisigBanner />
      <AdminNav />
      <RegisterAssetForm />
      <AssetsTable assets={assets} />
    </Container>
  );
}
