import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { truncateAddress } from "@/lib/format-address";

export interface OwnershipCardProps {
  readonly ownerAddress: string;
  readonly creatorAddress: string;
  /** Freshness marker (`docs/spec/09-data-model.md`'s `last_synced_block`) —
   *  the indexed "fast path" owner; any owner-gated action re-confirms
   *  against chain before acting, never trusts this column alone. */
  readonly ownerLastSyncedBlock: number;
}

export function OwnershipCard({ ownerAddress, creatorAddress, ownerLastSyncedBlock }: OwnershipCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Ownership</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2 text-sm">
        <div className="flex items-center justify-between gap-2">
          <span className="text-subtle-foreground">Owner</span>
          <span className="font-mono" title={ownerAddress}>
            {truncateAddress(ownerAddress)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-subtle-foreground">Creator</span>
          <span className="font-mono" title={creatorAddress}>
            {truncateAddress(creatorAddress)}
          </span>
        </div>
        <p className="text-xs text-subtle-foreground">
          Indexed as of block {ownerLastSyncedBlock} — always confirmed on-chain before any
          owner-gated action.
        </p>
      </CardContent>
    </Card>
  );
}
