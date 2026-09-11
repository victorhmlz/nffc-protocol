import type { OfferSummary } from "@domain/nffc-detail/detail";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui";
import { formatEth } from "@/lib/format-eth";
import { truncateAddress } from "@/lib/format-address";
import { OfferRowActions } from "@/components/nffc/offer-row-actions";
import { MakeOfferForm } from "@/components/nffc/make-offer-form";

export interface OffersListProps {
  readonly tokenId: string;
  readonly ownerAddress: string;
  readonly offers: readonly OfferSummary[];
}

/**
 * Active offers, plus the actions TASK-29 adds: a visitor can make a new
 * offer (`MakeOfferForm`); the connected wallet sees Accept (if it's the
 * NFFC's owner) or Cancel (if it's that row's buyer) via `OfferRowActions` —
 * both Server-visible without a wallet, same as `ListingCard` (TASK-20/21).
 */
export function OffersList({ tokenId, ownerAddress, offers }: OffersListProps) {
  const active = offers.filter((o) => o.active);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Offers</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {active.length === 0 ? (
          <p className="text-sm text-muted-foreground">No active offers.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Buyer</TableHead>
                <TableHead numeric>Price</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {active.map((o) => (
                <TableRow key={o.offerId}>
                  <TableCell className="font-mono">{truncateAddress(o.buyerAddress)}</TableCell>
                  <TableCell numeric>{formatEth(o.priceWei)}</TableCell>
                  <TableCell>{new Date(o.expiry).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <OfferRowActions offerId={o.offerId} buyerAddress={o.buyerAddress} ownerAddress={ownerAddress} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        <MakeOfferForm tokenId={tokenId} />
      </CardContent>
    </Card>
  );
}
