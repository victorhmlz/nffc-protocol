import { isAddress } from "viem";
import type { NextRequest } from "next/server";
import { getPortfolio } from "@/lib/portfolio/get-portfolio";

/**
 * A wallet's portfolio (TASK-25) — owned NFFCs, Reference NAV, performance,
 * and exposure by asset/segment/collection (`domain/portfolio/portfolio.ts`).
 *
 * `/portfolio` (TASK-25) has no `[address]` URL segment — wallet identity
 * only exists client-side in this self-custody DApp (`useAccount()`, TASK-16)
 * — so unlike `/nffc/[tokenId]`, the page itself can't be a plain Server
 * Component fetching by URL param; it fetches this route once it knows which
 * wallet is connected. Never cached (`Cache-Control: no-store`), same as
 * `/api/nffc/[tokenId]/market` — portfolio data is exactly as volatile as
 * Reference NAV, for the same reason.
 */
export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  ctx: RouteContext<"/api/portfolio/[address]">,
): Promise<Response> {
  const { address } = await ctx.params;

  if (!isAddress(address)) {
    return Response.json(
      { error: "invalid_address", address },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  const portfolio = await getPortfolio(address);

  return Response.json(portfolio, { status: 200, headers: { "Cache-Control": "no-store" } });
}
