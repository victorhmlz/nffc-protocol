/**
 * `/nffc/[tokenId]`'s one data-access seam (TASK-21). Fixes the exact
 * eventual contract — `GetNffcDetail` — the real indexer (TASK-24) fulfills;
 * until then, {@link getNffcDetail} answers it from a static fixture
 * (`fixture-detail.ts`). `null` means "no such NFFC" (or not indexed yet) —
 * the page renders Next's `notFound()`, never a blank/broken page.
 *
 * Wrapped in `unstable_cache` (this project's "previous model" caching — see
 * `docs/marketplace-ui.md` for why; `cacheComponents` is not enabled) so
 * repeated requests for the same token don't redo the work.
 */
import { unstable_cache } from "next/cache";
import type { NffcDetail } from "@domain/nffc-detail/detail";
import { FIXTURE_DETAILS } from "@/lib/nffc-detail/fixture-detail";

export type GetNffcDetail = (tokenId: string) => Promise<NffcDetail | null>;

const getCached = unstable_cache(
  async (tokenId: string): Promise<NffcDetail | null> => FIXTURE_DETAILS.get(tokenId) ?? null,
  ["nffc-detail"],
  { revalidate: 300, tags: ["nffc-detail"] },
);

export const getNffcDetail: GetNffcDetail = async (tokenId) => getCached(tokenId);
