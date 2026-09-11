import type { Metadata } from "next";
import { Container } from "@/components/ui";
import { ActivityFilters } from "@/components/activity/activity-filters";
import { ActivityTimeline } from "@/components/nffc/activity-timeline";
import { Pagination } from "@/components/market/pagination";
import { getActivityFeed } from "@/lib/activity/get-activity";
import { parseActivitySearchParams, type RawSearchParams } from "@/lib/activity/parse-query";

// Same "previous model" caching story as `/market` (`docs/marketplace-ui.md`):
// this project does not enable `cacheComponents`, so reading `searchParams`
// below still opts each distinct filter/page combination into per-request
// dynamic rendering; `revalidate` here caches the underlying *data*
// (`get-activity.ts`'s `unstable_cache`), not the route's HTML.
export const revalidate = 300;

export const metadata: Metadata = {
  title: "Activity",
  description: "The global, indexed timeline of every mint, sale, transfer, listing, and offer.",
};

function toURLSearchParams(raw: RawSearchParams): URLSearchParams {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(raw)) {
    if (value === undefined) continue;
    for (const v of Array.isArray(value) ? value : [value]) params.append(key, v);
  }
  return params;
}

export default async function ActivityPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const raw = await searchParams;
  const query = parseActivitySearchParams(raw);
  const result = await getActivityFeed(query);

  return (
    <Container className="flex flex-col gap-6 py-10">
      <header className="flex flex-col gap-1">
        <h1 className="text-lg font-semibold tracking-tight">Activity</h1>
        <p className="text-sm text-muted-foreground">
          {result.total} event{result.total === 1 ? "" : "s"} match your filters — every mint,
          sale, transfer, listing, and offer, indexed.
        </p>
      </header>

      <ActivityFilters />
      <ActivityTimeline activity={result.items} showTokenLinks title="All events" />
      <Pagination
        page={result.page}
        pageSize={result.pageSize}
        total={result.total}
        buildHref={(page) => {
          const params = toURLSearchParams(raw);
          params.set("page", String(page));
          return `/activity?${params.toString()}`;
        }}
      />
    </Container>
  );
}
