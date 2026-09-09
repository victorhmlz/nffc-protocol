import {
  Pool,
  type PoolClient,
  type QueryResult,
  type QueryResultRow,
} from "pg";
import { getConfig } from "@infra/env";
import { getLogger } from "@infra/logging/logger";

export class DatabaseNotConfiguredError extends Error {
  override name = "DatabaseNotConfiguredError";
  constructor() {
    super("No DATABASE_URL configured for this environment.");
  }
}

let pool: Pool | undefined;

/**
 * Lazily-created connection pool. Does not connect on import — the first query
 * opens a connection. Throws {@link DatabaseNotConfiguredError} if no database
 * is configured (allowed in dev/test; not in staging/production — see
 * `infra/env.ts`).
 */
export function getPool(): Pool {
  if (pool) return pool;
  const cfg = getConfig().database;
  if (!cfg) throw new DatabaseNotConfiguredError();

  pool = new Pool({
    connectionString: cfg.url,
    max: cfg.maxConnections,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
  });
  pool.on("error", (err) => {
    getLogger().error(
      { component: "db", err: { message: err.message } },
      "idle client error",
    );
  });
  return pool;
}

export function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: readonly unknown[],
): Promise<QueryResult<T>> {
  return getPool().query<T>(text, params ? [...params] : undefined);
}

/** Run `fn` inside a transaction, rolling back on throw. */
export async function withTransaction<T>(
  fn: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

/** `true` if a trivial round-trip succeeds. Never throws. */
export async function pingDb(): Promise<boolean> {
  try {
    await query("select 1");
    return true;
  } catch {
    return false;
  }
}

/** Close the pool (graceful worker shutdown, test teardown). */
export async function closePool(): Promise<void> {
  if (!pool) return;
  await pool.end();
  pool = undefined;
}
