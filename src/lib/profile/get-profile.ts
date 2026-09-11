/**
 * `/profile/[address]`'s one data-access seam (TASK-27). Fixes the exact
 * eventual contract — `GetProfile` — the real indexer (TASK-24, merged)
 * fulfills once there's a live database to query by `creator_address` /
 * `owner_address` / `seller_address`; until then, answers it by composing
 * two seams TASK-27 doesn't own: `FIXTURE_LISTINGS` (`@/lib/marketplace/
 * fixture-listings`, TASK-20 — the same indexed `nffc`/`listing` mirror
 * `/market` and `/portfolio` already read) and `getActivityFeed`
 * (`@/lib/activity/get-activity`, TASK-26), filtered by wallet.
 *
 * Wrapped in `unstable_cache`, same as `get-nffc-detail.ts` (TASK-21) —
 * unlike `/portfolio` (personal, wallet-connected data, deliberately
 * uncached), a profile is public and shareable
 * (`docs/spec/07-ux-map.md`: "No" wallet needed to view), so caching it the
 * same way `/market` and `/nffc/[tokenId]` already do is the right default.
 */
import { unstable_cache } from "next/cache";
import { buildProfile, type Profile } from "@domain/profile/profile";
import { FIXTURE_LISTINGS } from "@/lib/marketplace/fixture-listings";
import { getActivityFeed } from "@/lib/activity/get-activity";

export type GetProfile = (address: string) => Promise<Profile>;

/** How many of the wallet's most recent activity entries the profile page
 *  shows inline — the full, paginated history is one click away at
 *  `/activity?wallet=<address>` (TASK-26). */
const RECENT_ACTIVITY_LIMIT = 20;

const getCached = unstable_cache(
  async (address: string): Promise<Profile> => {
    const activity = await getActivityFeed({
      filter: { wallet: address },
      page: 1,
      pageSize: RECENT_ACTIVITY_LIMIT,
    });
    return buildProfile(address, FIXTURE_LISTINGS, activity.items);
  },
  ["profile"],
  { revalidate: 300, tags: ["profile"] },
);

export const getProfile: GetProfile = async (address) => getCached(address);
