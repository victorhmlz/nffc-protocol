# `adapters/`

Provider / Network Adapter implementations. Each implements the **same**
`ProviderAdapter` interface from `@domain/ports` — no hierarchy between providers
(`docs/spec/05-adapter-architecture.md`).

**Boundaries** (enforced by ESLint): may import `domain/`; may **not** import `src/`, `workers/`,
or `next`.

## Layout

| Path | Contents | TASK |
|---|---|---|
| `provider-adapter-registry.ts` | `ProviderId → ProviderAdapter` lookup, populated at the composition root | TASK-02 |
| `index.ts` | Barrel | TASK-02 |
| `robinhood/` | Robinhood Stock Token adapter + sync worker glue | TASK-06 |
| `crypto/` | Native-crypto (BTC, ETH via Chainlink) adapter — same interface | TASK-07 |

`robinhood/` and `crypto/` are created by their own TASKS. The registry compiles and is testable
now with zero adapters registered.
