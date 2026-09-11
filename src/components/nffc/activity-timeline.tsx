import Link from "next/link";
import type { ActivityEntry } from "@domain/nffc-detail/detail";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { formatEth } from "@/lib/format-eth";
import { truncateAddress } from "@/lib/format-address";

const KIND_LABEL: Record<ActivityEntry["kind"], string> = {
  MINT: "Minted",
  TRANSFER: "Transferred",
  LISTING_CREATED: "Listed",
  LISTING_CANCELLED: "Listing cancelled",
  SALE: "Sold",
  OFFER_CREATED: "Offer made",
  OFFER_ACCEPTED: "Offer accepted",
  OFFER_CANCELLED: "Offer cancelled",
};

export interface ActivityTimelineProps {
  /** Newest first — see `domain/nffc-detail/detail.ts`. */
  readonly activity: readonly ActivityEntry[];
  /** Shows which NFFC each entry belongs to, linked to `/nffc/[tokenId]`
   *  (TASK-26) — on by default off (`false`) so the per-token page
   *  (TASK-21, where the token is already implied by the page itself)
   *  renders exactly as before; the global `/activity` feed (TASK-26, where
   *  entries span every token) turns it on. `entry.tokenId` (added TASK-24)
   *  is what makes this possible — `null` for a non-token event renders no
   *  link, same as any other optional field here. */
  readonly showTokenLinks?: boolean;
  readonly title?: string;
}

/** Every entry traces to a block number + transaction hash — no summary here
 *  is presented without its on-chain origin (TASK-21 acceptance). */
export function ActivityTimeline({ activity, showTokenLinks, title = "Activity" }: ActivityTimelineProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {activity.length === 0 ? (
          <p className="text-sm text-muted-foreground">No activity yet.</p>
        ) : (
          <ol className="flex flex-col gap-3">
            {activity.map((entry) => (
              <li key={entry.id} className="flex items-start justify-between gap-3 text-sm">
                <div className="flex flex-col">
                  <span className="font-medium">
                    {KIND_LABEL[entry.kind]}
                    {showTokenLinks && entry.tokenId && (
                      <>
                        {" "}
                        ·{" "}
                        <Link href={`/nffc/${entry.tokenId}`} className="font-normal hover:underline">
                          NFFC #{entry.tokenId}
                        </Link>
                      </>
                    )}
                  </span>
                  <span className="text-xs text-subtle-foreground">
                    {truncateAddress(entry.actorAddress)}
                    {entry.counterpartyAddress ? ` → ${truncateAddress(entry.counterpartyAddress)}` : ""}
                  </span>
                </div>
                <div className="flex flex-col items-end">
                  {entry.amountWei && (
                    <span className="font-mono tabular-nums">{formatEth(entry.amountWei)}</span>
                  )}
                  <span className="text-xs text-subtle-foreground" title={entry.txHash}>
                    {new Date(entry.occurredAt).toLocaleDateString()} · block {entry.blockNumber}
                  </span>
                </div>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
