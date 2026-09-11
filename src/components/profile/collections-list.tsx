import Link from "next/link";
import type { CreatedCollectionSummary } from "@domain/profile/profile";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui";

/**
 * Collections this wallet has minted into (TASK-27) — also reused by
 * `/search` (TASK-28) for its collection-name matches, hence the
 * customizable `emptyLabel` (defaults to TASK-27's original copy, so that
 * page's rendering is unchanged). Links to `/collection/[collectionId]`
 * (`docs/spec/07-ux-map.md` §1) — that page has no assigned TASK yet, so
 * this link 404s until one builds it; same forward-reference precedent
 * `NffcCard` (TASK-20) set linking to `/nffc/[tokenId]` before TASK-21
 * existed. See `docs/OPEN_ISSUES.md` Issue #11.
 */
export function CollectionsList({
  collections,
  emptyLabel = "Hasn't created a collection yet.",
}: {
  readonly collections: readonly CreatedCollectionSummary[];
  readonly emptyLabel?: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Collections</CardTitle>
      </CardHeader>
      <CardContent>
        {collections.length === 0 ? (
          <p className="text-sm text-muted-foreground">{emptyLabel}</p>
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
