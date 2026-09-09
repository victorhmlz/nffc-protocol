-- 0001_init — infrastructure bookkeeping only.
-- Domain tables (registry mirror, nffc, listings, price/nav points, activity …)
-- are added by the migrations that ship with TASK-05 / TASK-09 / TASK-19 / TASK-23
-- / TASK-24. See docs/spec/09-data-model.md.

CREATE TABLE IF NOT EXISTS schema_migrations (
  version     text        PRIMARY KEY,
  applied_at  timestamptz NOT NULL DEFAULT now()
);

-- Idempotent resume point for every off-chain stream (indexer, provider sync,
-- NAV materializer). docs/spec/09-data-model.md § "Activity & indexer bookkeeping".
CREATE TABLE IF NOT EXISTS sync_cursor (
  stream       text        PRIMARY KEY,
  last_block   bigint      NOT NULL DEFAULT 0,
  last_run_at  timestamptz,
  status       text        NOT NULL DEFAULT 'OK'
                 CHECK (status IN ('OK', 'BEHIND', 'ERROR'))
);
