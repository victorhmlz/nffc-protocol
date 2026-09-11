import { describe, expect, it } from "vitest";
import type { NextRequest } from "next/server";
import { MARKET_DATA_NOTICE } from "@domain/metadata/metadata";
import { GET } from "./route";

type Ctx = { params: Promise<{ tokenId: string }> };

const ctx = (tokenId: string): Ctx => ({
  params: Promise.resolve({ tokenId }),
});
const req = {} as NextRequest;

describe("GET /api/nffc/[tokenId]/market", () => {
  it("rejects a non-numeric token id with 400", async () => {
    const res = await GET(req, ctx("nope") as never);
    expect(res.status).toBe(400);
    expect(res.headers.get("cache-control")).toBe("no-store");
  });

  it("returns a well-formed, never-cached snapshot with an unavailable reason", async () => {
    const before = Math.floor(Date.now() / 1000);
    const res = await GET(req, ctx("3") as never);
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("no-store");

    const body = (await res.json()) as {
      tokenId: string;
      referenceNav: null;
      components: unknown[];
      performance: unknown[];
      asOf: number;
      degraded: boolean;
      unavailableReason: string;
      notice: string;
    };
    expect(body.tokenId).toBe("3");
    expect(body.referenceNav).toBeNull();
    expect(body.components).toEqual([]);
    expect(body.performance).toEqual([]);
    expect(body.degraded).toBe(true);
    expect(body.asOf).toBeGreaterThanOrEqual(before);
    expect(body.unavailableReason).toMatch(/TASK-22\/23/);
    expect(body.notice).toBe(MARKET_DATA_NOTICE);
  });
});
