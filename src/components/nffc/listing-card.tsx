import type { IndexedListing } from "@domain/marketplace/listings";
import { Badge, Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { BuyButton } from "@/components/market/buy-button";
import { formatEth } from "@/lib/format-eth";
import { truncateAddress } from "@/lib/format-address";

export interface ListingCardProps {
  readonly tokenId: string;
  readonly listing: IndexedListing | null;
}

/** The current listing + Buy affordance — reuses TASK-20's `BuyButton` as-is. */
export function ListingCard({ tokenId, listing }: ListingCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Listing</CardTitle>
      </CardHeader>
      <CardContent>
        {listing?.active ? (
          <div className="flex items-center justify-between gap-3">
            <div className="flex flex-col">
              <span className="font-mono text-lg tabular-nums">{formatEth(listing.priceWei)}</span>
              <span className="text-xs text-subtle-foreground">
                {`Seller ${truncateAddress(listing.sellerAddress)}`}
              </span>
            </div>
            <BuyButton tokenId={tokenId} priceWei={listing.priceWei} />
          </div>
        ) : (
          <Badge variant="neutral">Not listed</Badge>
        )}
      </CardContent>
    </Card>
  );
}
