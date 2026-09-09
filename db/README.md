# `db/`

PostgreSQL migrations. Forward-only, plain SQL, applied in filename order.

```
db/migrations/NNNN_name.sql   one migration; runs in its own transaction
db/migrate.mjs                the runner (plain Node — no tsx needed)
```

## Run

```bash
DATABASE_URL=postgres://user:pass@host:5432/nffc pnpm db:migrate
pnpm db:migrate --dry-run    # list pending, apply nothing
```

Re-running is a no-op — applied versions are recorded in `schema_migrations`.

## Adding a migration

Create `db/migrations/NNNN_short_name.sql` with the next zero-padded number. Keep
each migration self-contained and idempotent-friendly (`CREATE TABLE IF NOT
EXISTS`, `CREATE INDEX IF NOT EXISTS`). Domain tables land here with the TASK
that introduces them (registry mirror → TASK-05, `nffc` → TASK-09, marketplace →
TASK-19, price/NAV → TASK-23, activity/indexer → TASK-24), following
`docs/spec/09-data-model.md`.

`0001_init` creates only infrastructure bookkeeping (`schema_migrations`,
`sync_cursor`).
