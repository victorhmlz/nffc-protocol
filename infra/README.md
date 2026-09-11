# `infra/`

Server-only runtime plumbing. **Boundaries** (enforced by ESLint — `docs/conventions.md` §1): may
import `domain/`, `config/`; may **not** import `src/`, `adapters/`, `workers/`, or `next`. Marked
`server-only` at each barrel; imports Node libraries (`pg`, `ioredis`, `pino`, `viem`).

| Path | Contents | TASK |
|---|---|---|
| `env.ts` | zod loader → typed `AppConfig`; `getConfig()` (cached), `loadConfigFrom()` (tests). `staging`/`production` require DB + Redis + RPC; dev/test tolerate their absence. | TASK-04 |
| `logging/logger.ts` | `Logger` interface + pino implementation; `getLogger()`, `child()`, key redaction. | TASK-04 (observability wiring: TASK-39) |
| `rpc/chain-reader.ts` | `ChainReader` (the `domain/ports` interface) over a viem `fallback` transport — **multiple endpoints, automatic failover**, not coupled to one RPC. | TASK-04 |
| `db/pool.ts` | Lazy `pg.Pool`; `query()`, `withTransaction()`, `pingDb()`, `closePool()`. | TASK-04 |
| `redis/client.ts` | Lazy `ioredis` client (`lazyConnect`); `pingRedis()`, `closeRedis()`. | TASK-04 |
| `health.ts` | `checkHealth()` — per-dependency readiness snapshot; probes never throw. | TASK-04 |
| `pricing/chainlink-price-oracle.ts` | `ChainlinkPriceOracle implements PriceOracle` (`@domain/ports`) — reads each representation's oracle metadata from `RepresentationRegistry` + the standard Chainlink `AggregatorV3Interface.latestRoundData()`; no asset-class branch (`docs/price-engine.md`). | TASK-22 |
| `valuation/postgres-price-store.ts`, `valuation/postgres-nav-store.ts` | `PriceStore` / `NavStore` (`@domain/ports`) over the `price_point` / `nav_point` tables (`db/migrations/0002_price_nav.sql`) — thin, untested glue, like `db/pool.ts` itself (`docs/valuation.md`). | TASK-23 |

Consumed by Route Handlers (`src/app/api/*`), Server Component data functions, and workers — always
at a composition root, never from `domain/`.
