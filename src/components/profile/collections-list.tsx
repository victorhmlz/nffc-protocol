import Link from "next/link";
import type { CreatedCollectionSummary } from "@domain/profile/profile";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui";

/**
 * Collections this wallet has minted into (TASK-27). Links to
 * `/collection/[collectionId]` (`docs/spec/07-ux-map.md` §1) — that page has
 * no assigned TASK yet, so this link 404s until one builds it; same
 * forward-reference precedent `NffcCard` (TASK-20) set linking to
 * `/nffc/[tokenId]` before TASK-21 existed. See KNOWN ISSUES,
 * `docs/reports/TASK-27-REPORT.md`.
 */
export function CollectionsList({ collections }: { readonly collections: readonly CreatedCollectionSummary[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Collections</CardTitle>
      </CardHeader>
      <CardContent>
        {collections.length === 0 ? (
          <p className="text-sm text-muted-foreground">Hasn&apos;t created a collection yet.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {collections.map((c) => (
              <li key={c.collectionId} className="flex items-center justify-between gap-3 text-sm">
                <Link href={`/collection/${c.collectionId}`} className="font-medium hover:underline">
                  {c.collectionName}
                </Link>
                <span className="text-xs text-subtle-foreground">
                  {c.nffcCount} NFFC{c.nffcCount === 1 ? "" : "s"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
