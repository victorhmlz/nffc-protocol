/**
 * `/activity`'s one data-access seam (TASK-26). Fixes the exact eventual
 * contract — `GetActivityFeed` — the real indexer (TASK-24, merged) fulfills
 * once there's a live database to query the global `activity` table against;
 * until then, answers it the same way `get-listings.ts` (TASK-20) does:
 * flattening every fixture NFFC's own activity list
 * (`FIXTURE_DETAILS`, TASK-21 — the same fixture `/nffc/[tokenId]` reads)
 * into one global feed and running the pure reference query
 * (`domain/activity/activity.ts`) over it.
 *
 * Wrapped in `unstable_cache` (this project's "previous model" caching —
 * `cacheComponents` is not enabled, see `next.config.ts`), same as
 * `get-listings.ts` — the cache key includes every argument, so distinct
 * filter/page combinations never collide.
 */
import { unstable_cache } from "next/cache";
import { queryActivity, type ActivityQuery, type ActivityQueryResult } from "@domain/activity/activity";
import type { ActivityEntry } from "@domain/nffc-detail/detail";
import { FIXTURE_DETAILS } from "@/lib/nffc-detail/fixture-detail";

export type GetActivityFeed = (query: ActivityQuery) => Promise<ActivityQueryResult>;

function allFixtureActivity(): readonly ActivityEntry[] {
  return Array.from(FIXTURE_DETAILS.values()).flatMap((detail) => detail.activity);
}

const getCached = unstable_cache(
  async (query: ActivityQuery) => queryActivity(allFixtureActivity(), query),
  ["activity-feed"],
  { revalidate: 300, tags: ["activity-feed"] },
);

export const getActivityFeed: GetActivityFeed = async (query) => getCached(query);
