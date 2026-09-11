import Link from "next/link";
import type { WalletSearchResult } from "@domain/search/search";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { truncateAddress } from "@/lib/format-address";

/** Links each match to `/profile/[address]` (TASK-27), live. */
export function WalletResultsList({ wallets }: { readonly wallets: readonly WalletSearchResult[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Wallets</CardTitle>
      </CardHeader>
      <CardContent>
        {wallets.length === 0 ? (
          <p className="text-sm text-muted-foreground">No matching wallets.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {wallets.map((w) => (
              <li key={w.address} className="flex items-center justify-between gap-3 text-sm">
                <Link href={`/profile/${w.address}`} className="font-mono font-medium hover:underline">
                  {truncateAddress(w.address)}
                </Link>
                <span className="text-xs text-subtle-foreground">
                  {w.createdCount} created · {w.ownedCount} owned
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
