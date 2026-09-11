-- 0002_price_nav — price and Reference NAV history (TASK-23).
-- docs/spec/09-data-model.md "Market data (derived; not permanent truth)".
--
-- Both tables are derived/cache, never the source of truth for a *current*
-- price or NAV (that's always recomputed live via ChainlinkPriceOracle /
-- computeReferenceNav, TASK-22/23) — this is the reproducible history.

CREATE TABLE IF NOT EXISTS price_point (
  id                 bigserial    PRIMARY KEY,
  representation_id  bytea        NOT NULL,
  raw_price          numeric      NOT NULL,
  normalized_price   numeric      NOT NULL,
  price_decimals     smallint     NOT NULL,
  source             text         NOT NULL,
  observed_at        timestamptz  NOT NULL,
  ingested_at        timestamptz  NOT NULL DEFAULT now(),
  is_stale           boolean      NOT NULL,
  UNIQUE (representation_id, observed_at, source)
);

CREATE INDEX IF NOT EXISTS price_point_representation_observed_idx
  ON price_point (representation_id, observed_at DESC);

CREATE TABLE IF NOT EXISTS nav_point (
  id             bigserial    PRIMARY KEY,
  token_id       bigint       NOT NULL,
  reference_nav  numeric      NOT NULL,
  computed_at    timestamptz  NOT NULL,
  basis          jsonb        NOT NULL,
  is_degraded    boolean      NOT NULL,
  UNIQUE (token_id, computed_at)
);

CREATE INDEX IF NOT EXISTS nav_point_token_computed_idx
  ON nav_point (token_id, computed_at DESC);
