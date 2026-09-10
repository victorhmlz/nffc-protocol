# 09 — Off-chain Data Model

**Source intent:** `NFFC_Whitepaper.md` v1.1 §7, §9; `NFFC_Roadmap.md` v1.1 Fase 08, Fase 17,
Fase 18; `NFFC_Development_Plan.md` v3.2 TASK-11, TASK-23, TASK-24;
`NFFC_Claude_Master_Prompt.md` v2.1 Rule 4.

---

## 1. Role of the database

PostgreSQL is an **index and cache** of on-chain state plus derived market data. Redis is a
short-lived cache / lock layer.

- **Ownership is never determined solely from the database** (`NFFC_Claude_Master_Prompt.md` v2.1
  Rule 4). Any action that depends on "who owns this NFFC" confirms against chain state (directly or
  via a freshly indexed, verifiable event), not against a `nffc.owner` column alone.
- Volatile market data (spot price, current NAV) is **never** treated as permanent truth
  (`NFFC_Development_Plan.md` TASK-11 acceptance). Static metadata (composition, art, mint-condition
  trait, static rarity) is immutable and independently verifiable from chain + content-addressed
  storage.
- The database can be **rebuilt from scratch** by replaying chain events + re-reading the oracle
  history. Nothing of record exists only in Postgres.

## 2. Schema (indicative — final DDL is TASK-04 / per-feature TASKS)

Naming: `snake_case`, singular table names, `id` surrogate keys plus natural keys where they exist.
Timestamps in UTC.

### Registry mirror (from on-chain registry events)

**`asset_identity`**
| column | type | notes |
|---|---|---|
| `asset_id` | bytea | PK, mirrors on-chain `bytes32` |
| `symbol` | text | |
| `name` | text | |
| `asset_class` | text | `EQUITY` / `CRYPTO` |
| `status` | text | `ACTIVE` / `INACTIVE` |
| `updated_block` | bigint | last block that changed this row |

**`provider`**
| column | type | notes |
|---|---|---|
| `provider_id` | text | PK — `ROBINHOOD`, `CRYPTO_NATIVE` |
| `name` | text | |
| `kind` | text | descriptive only |
| `status` | text | |

**`network`**
| column | type | notes |
|---|---|---|
| `chain_id` | bigint | PK — `4663` in V1 |
| `name` | text | |
| `native_gas_symbol` | text | `ETH` |
| `status` | text | |

**`representation`**
| column | type | notes |
|---|---|---|
| `representation_id` | bytea | PK |
| `asset_id` | bytea | FK → `asset_identity` |
| `provider_id` | text | FK → `provider` |
| `chain_id` | bigint | FK → `network` |
| `token_address` | bytea | verified contract address |
| `token_standard` | text | `ERC20` |
| `decimals` | smallint | |
| `multiplier` | numeric | |
| `oracle_feed` | bytea | Chainlink aggregator address |
| `oracle_heartbeat` | integer | seconds |
| `oracle_feed_decimals` | smallint | |
| `status` | text | `ACTIVE` / `INACTIVE` (auto on delist) |
| `created_at` / `updated_at` | timestamptz | |
| `updated_block` | bigint | |

### NFFC / collection mirror (from on-chain NFFC + Collection events)

**`collection`**
| column | type | notes |
|---|---|---|
| `collection_id` | bigint | PK |
| `creator_address` | bytea | |
| `name` | text | |
| `metadata_uri` | text | |
| `created_at` | timestamptz | |
| `created_block` | bigint | |

**`nffc`**
| column | type | notes |
|---|---|---|
| `token_id` | bigint | PK |
| `collection_id` | bigint | FK → `collection` |
| `creator_address` | bytea | |
| `owner_address` | bytea | **index of** on-chain owner; not authoritative on its own |
| `composition_hash` | bytea | keccak of canonical composition; matches on-chain |
| `segment` | text | `CRYPTO_ONLY` / `STOCK_ONLY` / `MIXED` (derived) |
| `static_rarity` | numeric | derived at mint |
| `mint_condition_trait` | jsonb | frozen at mint |
| `static_metadata_uri` | text | immutable (IPFS/Arweave) |
| `art_uri` | text | immutable |
| `minted_at` | timestamptz | |
| `minted_block` | bigint | |
| `last_synced_block` | bigint | ownership freshness marker |

**`nffc_component`**
| column | type | notes |
|---|---|---|
| `token_id` | bigint | FK → `nffc` |
| `position` | smallint | 0-based order as stored on-chain |
| `asset_id` | bytea | FK → `asset_identity` |
| `representation_id` | bytea | FK → `representation` (as chosen at mint) |
| `weight_bps` | smallint | > 0 |
| PK | (`token_id`, `position`) | |

### Market data (derived; not permanent truth)

**`price_point`**
| column | type | notes |
|---|---|---|
| `id` | bigserial | PK |
| `representation_id` | bytea | FK → `representation` |
| `raw_price` | numeric | as read from oracle |
| `normalized_price` | numeric | after decimals + multiplier |
| `price_decimals` | smallint | |
| `source` | text | e.g. `chainlink:<feed>` |
| `observed_at` | timestamptz | oracle `updatedAt` |
| `ingested_at` | timestamptz | when the worker stored it |
| `is_stale` | boolean | `now - observed_at > heartbeat + grace` |
| unique | (`representation_id`, `observed_at`, `source`) | idempotency |

**`nav_point`**
| column | type | notes |
|---|---|---|
| `id` | bigserial | PK |
| `token_id` | bigint | FK → `nffc` |
| `reference_nav` | numeric | Σ(weight_bps/10000 × normalized_price) |
| `computed_at` | timestamptz | |
| `basis` | jsonb | the `price_point` ids used, for reproducibility |
| `is_degraded` | boolean | true if any component price was stale/missing |
| unique | (`token_id`, `computed_at`) | |

### Marketplace mirror (from on-chain marketplace events)

**`listing`**: `token_id` (FK), `seller_address`, `price`, `active`, `created_block`,
`cancelled_block`, `sold_block`. **`offer`**: `offer_id` PK, `token_id`, `buyer_address`, `price`,
`expiry`, `status` (`ACTIVE`/`CANCELLED`/`ACCEPTED`/`EXPIRED`), `created_block`. Expiry is
informational here; the **contract** is authoritative on whether an offer is acceptable
(`NFFC_Development_Plan.md` TASK-29).

### Activity & indexer bookkeeping

**`activity`**
| column | type | notes |
|---|---|---|
| `id` | bigserial | PK |
| `kind` | text | `MINT` / `TRANSFER` / `LISTING_CREATED` / `LISTING_CANCELLED` / `SALE` / `OFFER_CREATED` / `OFFER_ACCEPTED` / `OFFER_CANCELLED` |
| `token_id` | bigint | nullable for non-token events |
| `actor_address` | bytea | |
| `counterparty_address` | bytea | nullable |
| `amount` | numeric | nullable |
| `block_number` | bigint | |
| `log_index` | integer | |
| `tx_hash` | bytea | |
| unique | (`tx_hash`, `log_index`) | **idempotency key** |

**`sync_cursor`**
| column | type | notes |
|---|---|---|
| `stream` | text | PK — e.g. `indexer:main`, `sync:robinhood`, `sync:crypto`, `nav:materializer` |
| `last_block` | bigint | last fully processed block |
| `last_run_at` | timestamptz | |
| `status` | text | `OK` / `BEHIND` / `ERROR` |

## 3. Idempotency & recovery (TASK-24)

- The indexer keys every write on `(tx_hash, log_index)` (or `(representation_id, observed_at, source)`
  for prices). Re-processing a block is a no-op (`NFFC_Development_Plan.md` TASK-24 acceptance:
  "Reprocesar el mismo bloque dos veces no duplica datos").
- On restart, the indexer resumes from `sync_cursor.last_block` minus a safe reorg depth and
  re-applies; upserts converge (`NFFC_Development_Plan.md` TASK-24: "Recuperación automática tras
  caída sin pérdida de eventos").
- Reorg handling: events below the safe depth are treated as final; above it, rows carry the block
  number so a reorg can invalidate and re-derive them.

## 4. Ownership resolution rule

Any owner-gated action (list, cancel, accept offer, admin) resolves ownership as:

1. Read `nffc.owner_address` + `last_synced_block` for a fast path.
2. If the action is value-moving or `last_synced_block` is older than a freshness threshold, confirm
   against chain (`ownerOf(tokenId)`) before proceeding.

The database is a convenience index; the chain is the authority.

## 5. Not modeled in V1

- User accounts / auth records beyond wallet address (no email/password system).
- Custody balances, vault positions (V2).
- Native token balances / governance (V1.5).
- Dynamic badge state (V1.5 — will extend `nffc` or add `nffc_badge` at TASK-41).
