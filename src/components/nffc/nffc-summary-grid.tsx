import type { IndexedNffcSummary } from "@domain/marketplace/listings";
import { NffcCard } from "@/components/market/nffc-card";

/**
 * A grid of `NffcCard`s over an arbitrary `IndexedNffcSummary[]` — the
 * generic form of what TASK-25's `HoldingsGrid` originally was (one owner's
 * held NFFCs). Generalized here (TASK-27) so `/profile/[address]`'s three
 * near-identical grids (created / owned / listed) reuse one component
 * instead of a third near-duplicate — the same "one read model, several
 * queries, one rendering" discipline this codebase has applied consistently
 * since TASK-20 (`domain/marketplace/listings.ts`'s own header comment).
 * `/portfolio` (TASK-25) was updated to call this directly; its own
 * `HoldingsGrid` file is retired, not left as a second copy.
 */
export function NffcSummaryGrid({
  items,
  emptyLabel,
}: {
  readonly items: readonly IndexedNffcSummary[];
  readonly emptyLabel: string;
}) {
  if (items.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
        {emptyLabel}
      </p>
    );
  }

  return (
    <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {items.map((nffc) => (
        <li key={nffc.tokenId}>
          <NffcCard nffc={nffc} />
        </li>
      ))}
    </ul>
  );
}
