# `config/`

Typed configuration. **Boundaries** (enforced by ESLint): may import `domain/`; may **not** import
`src/`, `adapters/`, `workers/`, or `next`.

## Layout

| Path       | Contents                                                                              | TASK            |
| ---------- | ------------------------------------------------------------------------------------- | --------------- |
| `chain.ts` | `ROBINHOOD_CHAIN` — fixed facts about Chain ID 4663 (name, `ETH` gas, L2 on Arbitrum) | TASK-02         |
| `types.ts` | `AppConfig` shape — RPC endpoints, database, Redis, log level                         | TASK-02 (shape) |
| `index.ts` | Barrel                                                                                | TASK-02         |

The **loader** — env parsing, validation, per-environment resolution, `.env.example` — is TASK-04.
No secrets in the repo; `config/` only holds shapes and non-secret constants.
