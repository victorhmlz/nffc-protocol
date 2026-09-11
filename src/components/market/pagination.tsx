import Link from "next/link";
import { Button } from "@/components/ui/button";

export interface PaginationProps {
  readonly page: number;
  readonly pageSize: number;
  readonly total: number;
  /** Builds the href for a given page, preserving every other query param. */
  readonly buildHref: (page: number) => string;
}

/**
 * Server Component — plain `<Link>`s, no client JS needed for pagination.
 * `disabled` is not a real HTML attribute on `<a>`, so a disabled edge is
 * rendered as a real (non-`asChild`) disabled `<Button>` rather than a link
 * that would still navigate despite looking disabled.
 */
export function Pagination({ page, pageSize, total, buildHref }: PaginationProps) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  if (pageCount <= 1) return null;

  const atStart = page <= 1;
  const atEnd = page >= pageCount;

  return (
    <nav aria-label="Pagination" className="flex items-center justify-center gap-2">
      {atStart ? (
        <Button variant="outline" size="sm" disabled>
          Previous
        </Button>
      ) : (
        <Button asChild variant="outline" size="sm">
          <Link href={buildHref(page - 1)}>Previous</Link>
        </Button>
      )}
      <span className="text-xs text-muted-foreground">
        Page {page} of {pageCount}
      </span>
      {atEnd ? (
        <Button variant="outline" size="sm" disabled>
          Next
        </Button>
      ) : (
        <Button asChild variant="outline" size="sm">
          <Link href={buildHref(page + 1)}>Next</Link>
        </Button>
      )}
    </nav>
  );
}
