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

export interface OffersListProps {
  readonly offers: readonly OfferSummary[];
}

/**
 * Active offers, read-only. Creating/accepting/cancelling an offer is
 * TASK-29's surface (`Depende de: TASK-19, TASK-24`, its own acceptance
 * criteria around expiry) — deliberately not built here, same scope decision
 * TASK-20 made for Buy vs. Offer; see `docs/nffc-detail.md`.
 */
export function OffersList({ offers }: OffersListProps) {
  const active = offers.filter((o) => o.active);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Offers</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {active.length === 0 ? (
          <p className="text-sm text-muted-foreground">No active offers.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Buyer</TableHead>
                <TableHead numeric>Price</TableHead>
                <TableHead>Expires</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {active.map((o) => (
                <TableRow key={o.offerId}>
                  <TableCell className="font-mono">{truncateAddress(o.buyerAddress)}</TableCell>
                  <TableCell numeric>{formatEth(o.priceWei)}</TableCell>
                  <TableCell>{new Date(o.expiry).toLocaleDateString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        <p className="text-xs text-subtle-foreground">
          Making an offer is a TASK-29 surface — this list is read-only for now.
        </p>
      </CardContent>
    </Card>
  );
}
