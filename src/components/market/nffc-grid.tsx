import type { MarketplaceQueryResult } from "@domain/marketplace/listings";
import { NffcCard } from "@/components/market/nffc-card";

/** The results grid + empty state. Pure Server Component — no client JS. */
export function NffcGrid({ result }: { result: MarketplaceQueryResult }) {
  if (result.items.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
        No NFFCs match these filters.
      </p>
    );
  }

  return (
    <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {result.items.map((nffc) => (
        <li key={nffc.tokenId}>
          <NffcCard nffc={nffc} />
        </li>
      ))}
    </ul>
  );
}
