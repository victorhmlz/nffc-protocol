import type { NextRequest } from "next/server";
import { STATIC_METADATA_CACHE_CONTROL } from "@domain/metadata/metadata";

/**
 * ERC-721 **static** metadata for an NFFC (`docs/metadata-architecture.md`).
 *
 * The canonical copy is the content-addressed document that
 * `NFFC.staticMetadataURI` points at — immutable and verifiable with only an RPC
 * node (`verifyStaticMetadataAgainstChain`). This endpoint is a convenience
 * mirror serving the identical bytes; a served document carries
 * `Cache-Control: ${STATIC_METADATA_CACHE_CONTROL}` because it never changes.
 *
 * Until the NFFC contract is deployed and indexed (TASK-21/24) there is no
 * source to build from, so this returns 503 (retryable, not cached).
 */
export const dynamic = "force-dynamic";

const TOKEN_ID = /^[1-9]\d{0,77}$/;

export async function GET(
  _req: NextRequest,
  ctx: RouteContext<"/api/nffc/[tokenId]/metadata">,
): Promise<Response> {
  const { tokenId } = await ctx.params;

  if (!TOKEN_ID.test(tokenId)) {
    return Response.json(
      { error: "invalid_token_id", tokenId },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  return Response.json(
    {
      error: "not_available",
      tokenId,
      canonical: "NFFC.staticMetadataURI (content-addressed)",
      servedWithCacheControl: STATIC_METADATA_CACHE_CONTROL,
      reason:
        "Static metadata is served once the NFFC contract is deployed and indexed (TASK-21/24). " +
        "It is immutable and independently verifiable from chain state — this API is only a mirror.",
    },
    { status: 503, headers: { "Cache-Control": "no-store" } },
  );
}
