-- 0003_indexer_mirror — the mirror tables the indexer (TASK-24) writes into,
-- plus its own activity log. docs/spec/09-data-model.md.
--
-- `collection` and its populating events (CollectionCreated) are
-- deliberately NOT in this migration or in TASK-24's own indexing scope —
-- see docs/indexer.md KNOWN ISSUES / docs/OPEN_ISSUES.md. `nffc.collection_id`
-- carries no foreign key to it for that reason.

CREATE TABLE IF NOT EXISTS nffc (
  token_id            bigint       PRIMARY KEY,
  collection_id       bigint       NOT NULL,
  creator_address     bytea        NOT NULL,
  owner_address       bytea        NOT NULL,
  composition_hash    bytea        NOT NULL,
  component_count     smallint     NOT NULL,
  minted_at           timestamptz  NOT NULL,
  minted_block        bigint       NOT NULL,
  last_synced_block   bigint       NOT NULL
);

CREATE TABLE IF NOT EXISTS nffc_component (
  token_id            bigint    NOT NULL REFERENCES nffc (token_id),
  position            smallint  NOT NULL,
  asset_id            bytea     NOT NULL,
  representation_id   bytea     NOT NULL,
  weight_bps          smallint  NOT NULL,
  PRIMARY KEY (token_id, position)
);

CREATE TABLE IF NOT EXISTS listing (
  token_id         bigint       PRIMARY KEY REFERENCES nffc (token_id),
  seller_address   bytea        NOT NULL,
  price            numeric      NOT NULL,
  active           boolean      NOT NULL,
  created_block    bigint       NOT NULL,
  cancelled_block  bigint,
  sold_block       bigint
);

CREATE TABLE IF NOT EXISTS offer (
  offer_id       bigint       PRIMARY KEY,
  token_id       bigint       NOT NULL REFERENCES nffc (token_id),
  buyer_address  bytea        NOT NULL,
  price          numeric      NOT NULL,
  expiry         timestamptz  NOT NULL,
  status         text         NOT NULL
                   CHECK (status IN ('ACTIVE', 'CANCELLED', 'ACCEPTED', 'EXPIRED')),
  created_block  bigint       NOT NULL
);

CREATE TABLE IF NOT EXISTS activity (
  id                     bigserial    PRIMARY KEY,
  kind                   text         NOT NULL,
  token_id               bigint,
  actor_address          bytea        NOT NULL,
  counterparty_address   bytea,
  amount                 numeric,
  block_number           bigint       NOT NULL,
  log_index              integer      NOT NULL,
  tx_hash                bytea        NOT NULL,
  UNIQUE (tx_hash, log_index)
);

CREATE INDEX IF NOT EXISTS activity_token_id_idx ON activity (token_id, block_number DESC);
CREATE INDEX IF NOT EXISTS listing_active_idx ON listing (active) WHERE active;
CREATE INDEX IF NOT EXISTS offer_token_status_idx ON offer (token_id, status);
