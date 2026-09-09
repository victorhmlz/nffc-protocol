import { describe, expect, it } from "vitest";
import { GET } from "./route";

describe("GET /api/health", () => {
  it("returns 200 with a JSON status body", async () => {
    const res = GET();
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("application/json");

    const body = (await res.json()) as {
      status: string;
      service: string;
      time: string;
    };
    expect(body.status).toBe("ok");
    expect(body.service).toBe("nffc-protocol");
    expect(Number.isNaN(Date.parse(body.time))).toBe(false);
  });
});
