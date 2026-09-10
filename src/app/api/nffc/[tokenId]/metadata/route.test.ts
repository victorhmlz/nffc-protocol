import { describe, expect, it } from "vitest";
import type { NextRequest } from "next/server";
import { GET } from "./route";

type Ctx = { params: Promise<{ tokenId: string }> };

const ctx = (tokenId: string): Ctx => ({
  params: Promise.resolve({ tokenId }),
});
const req = {} as NextRequest;

describe("GET /api/nffc/[tokenId]/metadata", () => {
  it("rejects a non-numeric token id with 400 and no-store", async () => {
    const res = await GET(req, ctx("abc") as never);
    expect(res.status).toBe(400);
    expect(res.headers.get("cache-control")).toBe("no-store");
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("invalid_token_id");
  });

  it("rejects token id 0", async () => {
    const res = await GET(req, ctx("0") as never);
    expect(res.status).toBe(400);
  });

  it("returns 503 for a valid id until the contract is indexed, pointing at the canonical URI", async () => {
    const res = await GET(req, ctx("42") as never);
    expect(res.status).toBe(503);
    // an error response is retryable — never cached as if immutable
    expect(res.headers.get("cache-control")).toBe("no-store");
    const body = (await res.json()) as {
      error: string;
      tokenId: string;
      canonical: string;
      servedWithCacheControl: string;
    };
    expect(body.error).toBe("not_available");
    expect(body.tokenId).toBe("42");
    expect(body.canonical).toMatch(/staticMetadataURI/);
    expect(body.servedWithCacheControl).toContain("immutable");
  });
});
