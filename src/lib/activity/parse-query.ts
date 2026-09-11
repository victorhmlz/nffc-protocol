/**
 * Turns the URL's search params (`?wallet=0x...&tokenId=7&kind=SALE&kind=
 * MINT&page=2`) into a typed `ActivityQuery`. Pure, unit-testable without a
 * request — mirrors `parseMarketplaceSearchParams` (TASK-20) exactly.
 * Unrecognized or malformed values fall back to "no filter" rather than
 * throwing: a hand-edited or stale URL degrades gracefully, never an error
 * page.
 */
import { ACTIVITY_DEFAULT_PAGE_SIZE, type ActivityQuery } from "@domain/activity/activity";
import type { ActivityKind } from "@domain/nffc-detail/detail";

export type RawSearchParams = Record<string, string | string[] | undefined>;

const KINDS: readonly ActivityKind[] = [
  "MINT",
  "TRANSFER",
  "LISTING_CREATED",
  "LISTING_CANCELLED",
  "SALE",
  "OFFER_CREATED",
  "OFFER_ACCEPTED",
  "OFFER_CANCELLED",
];

function first(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

function many(v: string | string[] | undefined): readonly string[] {
  if (v === undefined) return [];
  return Array.isArray(v) ? v : [v];
}

export function parseActivitySearchParams(params: RawSearchParams): ActivityQuery {
  const tokenId = first(params.tokenId);
  const wallet = first(params.wallet);

  const kind = many(params.kind).filter((k): k is ActivityKind => KINDS.includes(k as ActivityKind));

  const pageRaw = Number(first(params.page));
  const page = Number.isFinite(pageRaw) && pageRaw >= 1 ? Math.trunc(pageRaw) : 1;

  return {
    filter: {
      tokenId: tokenId || undefined,
      wallet: wallet || undefined,
      kind: kind.length > 0 ? kind : undefined,
    },
    page,
    pageSize: ACTIVITY_DEFAULT_PAGE_SIZE,
  };
}
