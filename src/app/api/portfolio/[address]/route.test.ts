import { describe, expect, it } from "vitest";
import type { NextRequest } from "next/server";
import { GET } from "./route";

type Ctx = { params: Promise<{ address: string }> };

const ctx = (address: string): Ctx => ({ params: Promise.resolve({ address }) });
const req = {} as NextRequest;

// A properly-shaped (40 hex char) EVM address, unlike this repo's shorter
// display-only fixture strings (e.g. `FIXTURE_LISTINGS`'s "0x1111…aaaa") —
// `isAddress` (this route's real validation) requires the real length, so a
// real caller (a connected wallet via `useAccount()`) always sends one of
// these; this address deliberately owns nothing in the fixture data, so the
// happy-path assertion only checks the response shape, not non-empty holdings.
const VALID_ADDRESS = `0x${"1".repeat(39)}a`;
const OTHER_VALID_ADDRESS = `0x${"2".repeat(39)}b`;

describe("GET /api/portfolio/[address]", () => {
  it("rejects a malformed address with 400", async () => {
    const res = await GET(req, ctx("not-an-address") as never);
    expect(res.status).toBe(400);
    expect(res.headers.get("cache-control")).toBe("no-store");
  });

  it("returns a well-formed, never-cached portfolio for a valid address", async () => {
    const res = await GET(req, ctx(VALID_ADDRESS) as never);
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("no-store");

    const body = (await res.json()) as {
      ownerAddress: string;
      holdings: unknown[];
      totalReferenceValue: number;
      degraded: boolean;
      exposureByAsset: unknown[];
      exposureBySegment: unknown[];
      exposureByCollection: unknown[];
    };
    expect(body.ownerAddress).toBe(VALID_ADDRESS);
    expect(Array.isArray(body.holdings)).toBe(true);
    expect(typeof body.totalReferenceValue).toBe("number");
    expect(typeof body.degraded).toBe("boolean");
  });

  it("returns an empty portfolio for an address that owns nothing", async () => {
    const res = await GET(req, ctx(OTHER_VALID_ADDRESS) as never);
    const body = (await res.json()) as { holdings: unknown[]; totalReferenceValue: number };
    expect(body.holdings).toEqual([]);
    expect(body.totalReferenceValue).toBe(0);
  });
});
