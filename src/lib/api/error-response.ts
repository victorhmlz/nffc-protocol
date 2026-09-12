/**
 * The API half of the unified error vocabulary (TASK-33). Route Handlers in
 * this codebase already return a well-formed 200/503 body with an explicit
 * domain-shaped reason for every *known* not-available-yet state (e.g.
 * `/api/nffc/[tokenId]/metadata`'s `{error: "not_available", reason: ...}"`
 * until TASK-21/24 land) — those are deliberate, tested response shapes and
 * this module does not touch them. What every route was missing is a
 * consistent envelope for the *unexpected* case: an RPC/DB call that throws
 * instead of resolving. {@link withApiErrorHandling} wraps a handler so that
 * case gets the same `{code, message, recoveryAction}` shape as every other
 * error surface in this app, instead of falling through to Next's generic,
 * unstructured 500.
 */
import { RpcConfigError } from "@infra/rpc/chain-reader";
import { getLogger } from "@infra/logging/logger";
import { ERROR_VOCABULARY, type ErrorCode } from "@domain/errors/errors";

type ApiErrorCode = Extract<ErrorCode, "api_unavailable" | "rpc_unavailable">;

export function apiErrorResponse(code: ApiErrorCode, cacheControl = "no-store"): Response {
  const entry = ERROR_VOCABULARY[code];
  return Response.json(
    { code, message: entry.message, recoveryAction: entry.recoveryAction },
    { status: 503, headers: { "Cache-Control": cacheControl } },
  );
}

/**
 * `RpcConfigError` (missing/misconfigured RPC endpoints, `infra/rpc/chain-
 * reader.ts`) classifies as `rpc_unavailable`; every other thrown error
 * classifies as the generic `api_unavailable` — from the client's
 * perspective "the API failed" either way, but the two are worth telling
 * apart in the server log this always writes to first.
 */
export function withApiErrorHandling<Args extends unknown[]>(
  handler: (...args: Args) => Promise<Response>,
): (...args: Args) => Promise<Response> {
  return async (...args: Args) => {
    try {
      return await handler(...args);
    } catch (err) {
      getLogger().error({ component: "api", err }, "unhandled API route error");
      return apiErrorResponse(err instanceof RpcConfigError ? "rpc_unavailable" : "api_unavailable");
    }
  };
}
