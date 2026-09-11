/**
 * Stand-in for the indexer (TASK-24) — a static, representative dataset in the
 * exact shape `IndexedNffcSummary` fixes (`domain/marketplace/listings.ts`).
 * Spans every segment, a spread of static rarity and mint-condition regimes,
 * and both listed and unlisted tokens, so filters/sorts are all exercisable
 * against `/market` without a database. `src/lib/marketplace/get-listings.ts`
 * is the only place that imports this — replacing it with a real indexed
 * query (TASK-24) needs no change anywhere else.
 */
import type { IndexedNffcSummary } from "@domain/marketplace/listings";

function art(seed: string): string {
  // A minimal, valid placeholder — real entries carry the pinned generative
  // art URI from `prepareMintMetadata` (TASK-18); this fixture only needs to
  // render *something* stable per token.
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="#2a78d6"/><text x="50" y="55" font-size="12" text-anchor="middle" fill="#fff">${seed}</text></svg>`,
  )}`;
}

export const FIXTURE_LISTINGS: readonly IndexedNffcSummary[] = [
  {
    tokenId: "1",
    collectionId: "1",
    collectionName: "Blue Chips",
    creatorAddress: "0x1111111111111111111111111111111111aaaa",
    ownerAddress: "0x1111111111111111111111111111111111aaaa",
    segment: "MIXED",
    staticRarity: 0.42,
    mintConditionRegime: "near-highs",
    componentCount: 2,
    components: [
      { position: 0, assetId: "asset:nvda", assetSymbol: "NVDA", assetClass: "EQUITY", weightBps: 6000 },
      { position: 1, assetId: "asset:btc", assetSymbol: "BTC", assetClass: "CRYPTO", weightBps: 4000 },
    ],
    artURI: art("NFFC #1"),
    mintedAt: "2026-08-01T12:00:00.000Z",
    listing: { sellerAddress: "0x1111111111111111111111111111111111aaaa", priceWei: "2500000000000000000", active: true },
  },
  {
    tokenId: "2",
    collectionId: "1",
    collectionName: "Blue Chips",
    creatorAddress: "0x1111111111111111111111111111111111aaaa",
    ownerAddress: "0x2222222222222222222222222222222222bbbb",
    segment: "CRYPTO_ONLY",
    staticRarity: 0.81,
    mintConditionRegime: "at-highs",
    componentCount: 1,
    components: [{ position: 0, assetId: "asset:eth", assetSymbol: "ETH", assetClass: "CRYPTO", weightBps: 10_000 }],
    artURI: art("NFFC #2"),
    mintedAt: "2026-08-03T09:30:00.000Z",
    listing: { sellerAddress: "0x2222222222222222222222222222222222bbbb", priceWei: "900000000000000000", active: true },
  },
  {
    tokenId: "3",
    collectionId: "2",
    collectionName: "Momentum Basket",
    creatorAddress: "0x3333333333333333333333333333333333cccc",
    ownerAddress: "0x3333333333333333333333333333333333cccc",
    segment: "STOCK_ONLY",
    staticRarity: 0.15,
    mintConditionRegime: "deep-drawdown",
    componentCount: 5,
    components: [
      { position: 0, assetId: "asset:nvda", assetSymbol: "NVDA", assetClass: "EQUITY", weightBps: 2000 },
      { position: 1, assetId: "asset:aapl", assetSymbol: "AAPL", assetClass: "EQUITY", weightBps: 2000 },
      { position: 2, assetId: "asset:msft", assetSymbol: "MSFT", assetClass: "EQUITY", weightBps: 2000 },
      { position: 3, assetId: "asset:amzn", assetSymbol: "AMZN", assetClass: "EQUITY", weightBps: 2000 },
      { position: 4, assetId: "asset:goog", assetSymbol: "GOOG", assetClass: "EQUITY", weightBps: 2000 },
    ],
    artURI: art("NFFC #3"),
    mintedAt: "2026-07-20T16:45:00.000Z",
    listing: null, // never listed
  },
  {
    tokenId: "4",
    collectionId: "2",
    collectionName: "Momentum Basket",
    creatorAddress: "0x3333333333333333333333333333333333cccc",
    ownerAddress: "0x4444444444444444444444444444444444dddd",
    segment: "MIXED",
    staticRarity: 0.63,
    mintConditionRegime: "mid",
    componentCount: 3,
    components: [
      { position: 0, assetId: "asset:msft", assetSymbol: "MSFT", assetClass: "EQUITY", weightBps: 4000 },
      { position: 1, assetId: "asset:btc", assetSymbol: "BTC", assetClass: "CRYPTO", weightBps: 3000 },
      { position: 2, assetId: "asset:eth", assetSymbol: "ETH", assetClass: "CRYPTO", weightBps: 3000 },
    ],
    artURI: art("NFFC #4"),
    mintedAt: "2026-08-05T08:00:00.000Z",
    listing: { sellerAddress: "0x4444444444444444444444444444444444dddd", priceWei: "5000000000000000000", active: true },
  },
  {
    tokenId: "5",
    collectionId: "3",
    collectionName: "Solo Bitcoin",
    creatorAddress: "0x5555555555555555555555555555555555eeee",
    ownerAddress: "0x5555555555555555555555555555555555eeee",
    segment: "CRYPTO_ONLY",
    staticRarity: 1,
    mintConditionRegime: "near-highs",
    componentCount: 1,
    components: [{ position: 0, assetId: "asset:btc", assetSymbol: "BTC", assetClass: "CRYPTO", weightBps: 10_000 }],
    artURI: art("NFFC #5"),
    mintedAt: "2026-08-06T18:00:00.000Z",
    listing: null,
  },
];
