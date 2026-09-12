import type { NextRequest } from "next/server";
import { MARKET_DATA_CACHE_CONTROL, MARKET_DATA_NOTICE } from "@domain/metadata/metadata";
import { getNffcMarketSnapshot } from "@/lib/nffc-detail/get-nffc-market-snapshot";
import { isValidTokenId } from "@/lib/token-id";
import { withApiErrorHandling } from "@/lib/api/error-response";

/**
 * **Dynamic** market data for an NFFC — Reference NAV and per-component prices
 * (`docs/metadata-architecture.md`). Volatile, oracle-sourced, recomputed on
 * read; every datum carries `source` + `observedAt`. Never cached as a response
 * (`Cache-Control: ${MARKET_DATA_CACHE_CONTROL}`) and never part of the static
 * metadata.
 *
 * The NAV / price engines are TASK-22/23; until then this returns a well-formed
 * `NffcMarketSnapshot` with `unavailableReason` set (HTTP 200 — the UI renders
 * an explicit "unavailable" state, `docs/spec/07-ux-map.md` §6).
 */
export const dynamic = "force-dynamic";

export const GET = withApiErrorHandling(async function GET(
  _req: NextRequest,
  ctx: RouteContext<"/api/nffc/[tokenId]/market">,
): Promise<Response> {
  const { tokenId } = await ctx.params;

  if (!isValidTokenId(tokenId)) {
    return Response.json(
      { error: "invalid_token_id", tokenId },
      { status: 400, headers: { "Cache-Control": MARKET_DATA_CACHE_CONTROL } },
    );
  }

  const snapshot = await getNffcMarketSnapshot(tokenId);

  return Response.json(
    { ...snapshot, notice: MARKET_DATA_NOTICE },
    { status: 200, headers: { "Cache-Control": MARKET_DATA_CACHE_CONTROL } },
  );
});
