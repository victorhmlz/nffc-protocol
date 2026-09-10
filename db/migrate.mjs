#!/usr/bin/env node
// Minimal forward-only migration runner. Plain Node ESM (no TS transform) so it
// runs on any supported Node without tsx. Applies db/migrations/*.sql in
// filename order, each in its own transaction, recording applied versions in
// schema_migrations. Re-running is a no-op.
//
//   DATABASE_URL=postgres://… pnpm db:migrate
//   pnpm db:migrate --dry-run

import { readdir, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const MIGRATIONS_DIR = join(
  dirname(fileURLToPath(import.meta.url)),
  "migrations",
);
const dryRun = process.argv.includes("--dry-run");

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is required.");
  process.exit(1);
}

const files = (await readdir(MIGRATIONS_DIR))
  .filter((f) => f.endsWith(".sql"))
  .sort();

const client = new pg.Client({ connectionString: url });
await client.connect();

try {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version text PRIMARY KEY,
      applied_at timestamptz NOT NULL DEFAULT now()
    )`);

  const { rows } = await client.query("SELECT version FROM schema_migrations");
  const applied = new Set(rows.map((r) => r.version));

  let ran = 0;
  for (const file of files) {
    const version = file.replace(/\.sql$/, "");
    if (applied.has(version)) continue;

    const sql = await readFile(join(MIGRATIONS_DIR, file), "utf8");
    if (dryRun) {
      console.log(`would apply ${version}`);
      ran++;
      continue;
    }

    await client.query("BEGIN");
    try {
      await client.query(sql);
      await client.query(
        "INSERT INTO schema_migrations (version) VALUES ($1)",
        [version],
      );
      await client.query("COMMIT");
      console.log(`applied ${version}`);
      ran++;
    } catch (err) {
      await client.query("ROLLBACK");
      console.error(`failed ${version}: ${err.message}`);
      process.exit(1);
    }
  }

  console.log(
    ran === 0
      ? "up to date"
      : `${dryRun ? "would apply" : "applied"} ${ran} migration(s)`,
  );
} finally {
  await client.end();
}
