import { checkHealth } from "@infra/health";

/**
 * Readiness probe. Reports each dependency (database, redis, RPC) and returns
 * 503 when something configured is down, 200 otherwise. Distinct from
 * `/api/health`, which is a dependency-free liveness probe.
 */
export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  const report = await checkHealth();
  return Response.json(report, {
    status: report.status === "ok" ? 200 : 503,
  });
}
