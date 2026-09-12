import type { Metadata } from "next";
import { Card, CardContent, CardHeader, CardTitle, Container } from "@/components/ui";
import { AdminNav } from "@/components/admin/admin-nav";
import { MultisigBanner } from "@/components/admin/multisig-banner";
import { FeeCurveForm } from "@/components/admin/fee-curve-form";
import { MarketplaceFeeForm } from "@/components/admin/marketplace-fee-form";
import { FeeRecipientForm } from "@/components/admin/fee-recipient-form";
import { RoyaltyForm } from "@/components/admin/royalty-form";
import { getFeeConfig } from "@/lib/admin/get-fee-config";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Admin — Fees" };

export default async function AdminFeesPage() {
  const fees = await getFeeConfig();
  const royaltyEntries = Object.entries(fees.royaltyBpsByCollection);

  return (
    <Container className="flex flex-col gap-6 py-10">
      <header className="flex flex-col gap-1">
        <h1 className="text-lg font-semibold tracking-tight">Fees</h1>
        <p className="text-sm text-muted-foreground">
          FeeConfig — the single point of configuration for every protocol fee (see
          docs/fee-engine.md).
        </p>
      </header>

      <MultisigBanner />
      <AdminNav />

      <Card>
        <CardHeader>
          <CardTitle>Fee curves</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <FeeCurveForm kind="collection" current={fees.collectionFeeCurve} />
          <FeeCurveForm kind="mint" current={fees.mintFeeCurve} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Marketplace fee</CardTitle>
        </CardHeader>
        <CardContent>
          <MarketplaceFeeForm currentBps={fees.marketplaceFeeBps} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Fee recipient</CardTitle>
        </CardHeader>
        <CardContent>
          <FeeRecipientForm currentRecipient={fees.feeRecipient} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Royalties</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {royaltyEntries.length > 0 && (
            <ul className="flex flex-col gap-1 text-sm">
              {royaltyEntries.map(([collectionId, bps]) => (
                <li key={collectionId}>
                  Collection #{collectionId}: <span className="font-mono">{bps}</span> bps
                </li>
              ))}
            </ul>
          )}
          <RoyaltyForm />
        </CardContent>
      </Card>
    </Container>
  );
}
