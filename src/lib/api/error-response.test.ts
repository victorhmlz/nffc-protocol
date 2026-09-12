import { describe, expect, it } from "vitest";
import { RpcConfigError } from "@infra/rpc/chain-reader";
import { ERROR_VOCABULARY } from "@domain/errors/errors";
import { apiErrorResponse, withApiErrorHandling } from "@/lib/api/error-response";

describe("apiErrorResponse", () => {
  it("builds a {code, message, recoveryAction} 503 for a known code", async () => {
    const res = apiErrorResponse("api_unavailable");
    expect(res.status).toBe(503);
    expect(res.headers.get("Cache-Control")).toBe("no-store");
    await expect(res.json()).resolves.toEqual({
      code: "api_unavailable",
      message: ERROR_VOCABULARY.api_unavailable.message,
      recoveryAction: ERROR_VOCABULARY.api_unavailable.recoveryAction,
    });
  });
});

describe("withApiErrorHandling", () => {
  it("passes through a successful response untouched", async () => {
    const handler = withApiErrorHandling(async () => Response.json({ ok: true }, { status: 200 }));
    const res = await handler();
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ ok: true });
  });

  it("classifies a thrown RpcConfigError as rpc_unavailable", async () => {
    const handler = withApiErrorHandling(async (): Promise<Response> => {
      throw new RpcConfigError("no endpoints configured");
    });
    const res = await handler();
    expect(res.status).toBe(503);
    await expect(res.json()).resolves.toMatchObject({ code: "rpc_unavailable" });
  });

  it("classifies any other thrown error as the generic api_unavailable", async () => {
    const handler = withApiErrorHandling(async (): Promise<Response> => {
      throw new Error("ECONNREFUSED");
    });
    const res = await handler();
    expect(res.status).toBe(503);
    await expect(res.json()).resolves.toMatchObject({ code: "api_unavailable" });
  });

  it("forwards handler arguments unchanged", async () => {
    const handler = withApiErrorHandling(async (a: number, b: string) =>
      Response.json({ a, b }, { status: 200 }),
    );
    const res = await handler(42, "x");
    await expect(res.json()).resolves.toEqual({ a: 42, b: "x" });
  });
});
