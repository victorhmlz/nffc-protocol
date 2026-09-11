import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  CompositionTable,
  Container,
  GeoEligibilityNotice,
  NffcArt,
  NffcMarketPanel,
  SegmentBadge,
  StaticRarityStat,
} from "@/components/ui";
import { ActivityTimeline } from "@/components/nffc/activity-timeline";
import { ListingCard } from "@/components/nffc/listing-card";
import { MintConditionCard } from "@/components/nffc/mint-condition-card";
import { OffersList } from "@/components/nffc/offers-list";
import { OwnershipCard } from "@/components/nffc/ownership-card";
import { getNffcDetail } from "@/lib/nffc-detail/get-nffc-detail";
import { getNffcMarketSnapshot } from "@/lib/nffc-detail/get-nffc-market-snapshot";
import { isValidTokenId } from "@/lib/token-id";

// Classic ISR: no generateStaticParams (dynamicParams stays true, its
// default), so every tokenId is server-rendered on first visit and cached as
// static HTML for `revalidate` seconds after — a stable, indexable,
// shareable URL per NFFC, exactly the TASK-21 entregable, and unlike
// `/market` (TASK-20), this route needs no `searchParams`, so it isn't
// forced into per-request dynamic rendering (`docs/OPEN_ISSUES.md` Issue #5
// doesn't apply here).
export const revalidate = 300;

interface PageParams {
  readonly tokenId: string;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<PageParams>;
}): Promise<Metadata> {
  const { tokenId } = await params;
  if (!isValidTokenId(tokenId)) return {};
  const detail = await getNffcDetail(tokenId);
  if (!detail) return {};

  // No `openGraph.images` here — the colocated `opengraph-image.tsx` file
  // convention supplies it automatically, rasterizing the exact on-chain
  // generative art per token (the "correct social preview" entregable).
  return {
    title: detail.metadata.name,
    description: detail.metadata.description,
  };
}

export default async function NffcDetailPage({
  params,
}: {
  params: Promise<PageParams>;
}) {
  const { tokenId } = await params;
  if (!isValidTokenId(tokenId)) notFound();

  const detail = await getNffcDetail(tokenId);
  if (!detail) notFound();

  const facts = detail.metadata.nffc;
  const snapshot = await getNffcMarketSnapshot(tokenId);

  return (
    <Container className="flex flex-col gap-8 py-10">
      <div className="grid gap-6 lg:grid-cols-2">
        <NffcArt
          input={{
            seed: facts.compositionHash,
            components: facts.components.map((c) => ({ assetId: c.assetId, weightBps: c.weightBps })),
          }}
          className="aspect-square"
          label={`Generative art for ${detail.metadata.name}`}
        />
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <h1 className="text-lg font-semibold tracking-tight">{detail.metadata.name}</h1>
            <p className="text-sm text-muted-foreground">{detail.collectionName}</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <SegmentBadge segment={facts.segment} />
            {facts.staticRarity !== null && <StaticRarityStat score={facts.staticRarity} />}
          </div>
          <GeoEligibilityNotice segment={facts.segment} />
          <CompositionTable components={facts.components} />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <NffcMarketPanel snapshot={snapshot} now={snapshot.asOf * 1000} />
        <MintConditionCard trait={facts.mintConditionTrait} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <ListingCard tokenId={tokenId} listing={detail.listing} />
        <OwnershipCard
          ownerAddress={detail.ownerAddress}
          creatorAddress={detail.creatorAddress}
          ownerLastSyncedBlock={detail.ownerLastSyncedBlock}
        />
        <OffersList offers={detail.offers} />
      </div>

      <ActivityTimeline activity={detail.activity} />
    </Container>
  );
}
