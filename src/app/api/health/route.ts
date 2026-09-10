/**
 * Canonical Route Handler example and a liveness probe. Public, no wallet, no
 * database — safe for load balancers and uptime checks. Server-only by nature.
 */
export const dynamic = "force-dynamic";

export function GET(): Response {
  return Response.json({
    status: "ok",
    service: "nffc-protocol",
    time: new Date().toISOString(),
  });
}
