/**
 * Stand-in for the indexer (TASK-24) — full `NffcDetail` records built from
 * TASK-20's `FIXTURE_LISTINGS` so `/market` and `/nffc/[tokenId]` agree on the
 * same five tokens, enriched with the fuller static metadata (via TASK-11's
 * own `buildStaticNffcMetadata`, exactly as a real mint would produce it),
 * plus synthetic activity and offers. `src/lib/nffc-detail/get-nffc-detail.ts`
 * is the only importer — replacing this with a real indexed read (TASK-24)
 * needs no change anywhere else.
 */
import { keccak256, stringToHex } from "viem";
import type { AssetId, ProviderId, RepresentationId } from "@domain/registry/types";
import type { Hex32 } from "@domain/shared/branded";
import {
  buildStaticNffcMetadata,
  type StaticComponentFact,
  type StaticNffcFacts,
} from "@domain/metadata/metadata";
import type { ActivityEntry, NffcDetail, OfferSummary } from "@domain/nffc-detail/detail";
import { FIXTURE_LISTINGS } from "@/lib/marketplace/fixture-listings";

const MINT_CONDITION_BY_REGIME: Record<
  string,
  { weightedDrawdownBps: number; componentsAtHighFraction: number }
> = {
  "at-highs": { weightedDrawdownBps: 50, componentsAtHighFraction: 1 },
  "near-highs": { weightedDrawdownBps: 500, componentsAtHighFraction: 0.6 },
  mid: { weightedDrawdownBps: 1800, componentsAtHighFraction: 0.2 },
  "deep-drawdown": { weightedDrawdownBps: 6000, componentsAtHighFraction: 0 },
};

function providerFor(assetClass: string): ProviderId {
  return (assetClass === "CRYPTO" ? "CRYPTO_NATIVE" : "ROBINHOOD") as ProviderId;
}

function synthId(seed: string): string {
  return keccak256(stringToHex(seed));
}

function buildOne(item: (typeof FIXTURE_LISTINGS)[number], index: number): NffcDetail {
  const mintedAtBlock = 1_000_000 + index * 5_000;
  const components: StaticComponentFact[] = item.components.map((c) => ({
    position: c.position,
    assetId: synthId(`asset:${c.assetSymbol}`) as AssetId,
    assetSymbol: c.assetSymbol,
    assetClass: c.assetClass,
    providerId: providerFor(c.assetClass),
    representationId: synthId(`rep:${c.assetSymbol}:${item.tokenId}`) as RepresentationId,
    weightBps: c.weightBps,
  }));

  const condition = MINT_CONDITION_BY_REGIME[item.mintConditionRegime]!;
  const facts: StaticNffcFacts = {
    tokenId: item.tokenId,
    collectionId: item.collectionId,
    compositionHash: synthId(`composition:${item.tokenId}`) as Hex32,
    segment: item.segment,
    componentCount: item.componentCount,
    components,
    mintedAtBlock,
    staticRarity: item.staticRarity,
    mintConditionTrait: {
      "Weighted Drawdown (bps)": condition.weightedDrawdownBps,
      Regime: item.mintConditionRegime,
      "Components At Highs": Math.round(item.componentCount * condition.componentsAtHighFraction),
      "Minted At Block": mintedAtBlock,
    },
  };

  const metadata = buildStaticNffcMetadata({
    facts,
    collectionName: item.collectionName,
    artURI: item.artURI,
    externalBaseUrl: "https://nffc.example",
  });

  const activity: ActivityEntry[] = [
    {
      id: `${item.tokenId}-mint`,
      kind: "MINT",
      tokenId: item.tokenId,
      actorAddress: item.creatorAddress,
      counterpartyAddress: null,
      amountWei: null,
      blockNumber: mintedAtBlock,
      txHash: synthId(`tx:mint:${item.tokenId}`),
      occurredAt: item.mintedAt,
    },
  ];
  if (item.ownerAddress !== item.creatorAddress) {
    activity.push({
      id: `${item.tokenId}-transfer`,
      kind: "TRANSFER",
      tokenId: item.tokenId,
      actorAddress: item.creatorAddress,
      counterpartyAddress: item.ownerAddress,
      amountWei: null,
      blockNumber: mintedAtBlock + 100,
      txHash: synthId(`tx:transfer:${item.tokenId}`),
      occurredAt: item.mintedAt,
    });
  }
  if (item.listing?.active) {
    activity.push({
      id: `${item.tokenId}-listed`,
      kind: "LISTING_CREATED",
      tokenId: item.tokenId,
      actorAddress: item.listing.sellerAddress,
      counterpartyAddress: null,
      amountWei: item.listing.priceWei,
      blockNumber: mintedAtBlock + 200,
      txHash: synthId(`tx:list:${item.tokenId}`),
      occurredAt: item.mintedAt,
    });
  }

  // A little variety: token #1 also carries one active offer below its ask.
  const offers: OfferSummary[] =
    item.tokenId === "1"
      ? [
          {
            offerId: "1",
            buyerAddress: "0x9999999999999999999999999999999999aaaa",
            priceWei: "2000000000000000000",
            expiry: "2099-01-01T00:00:00.000Z",
            active: true,
          },
        ]
      : [];

  return {
    metadata,
    staticMetadataURI: `data:application/json,${encodeURIComponent(JSON.stringify(metadata))}`,
    collectionName: item.collectionName,
    creatorAddress: item.creatorAddress,
    ownerAddress: item.ownerAddress,
    ownerLastSyncedBlock: mintedAtBlock + 200,
    mintedAt: item.mintedAt,
    listing: item.listing,
    offers,
    activity,
  };
}

export const FIXTURE_DETAILS: ReadonlyMap<string, NffcDetail> = new Map(
  FIXTURE_LISTINGS.map((item, index) => [item.tokenId, buildOne(item, index)]),
);
