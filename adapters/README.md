# `adapters/`

Provider / Network Adapter implementations. Each implements the **same** `domain/ports`
interfaces — no hierarchy between providers (`docs/spec/05-adapter-architecture.md`).

| Path | Contents | First TASK |
|---|---|---|
| `adapters/robinhood/` | Robinhood Stock Token adapter + off-chain sync worker glue | TASK-06 |
| `adapters/crypto/` | Native-crypto (BTC, ETH via Chainlink) adapter — same interface as Robinhood | TASK-07 |

An adapter **may** import its own provider's specifics; it **may not** be imported by `domain/`.
Adapters are wired in at the app / worker composition root, never inside the domain.

Empty in TASK-01 by design.
