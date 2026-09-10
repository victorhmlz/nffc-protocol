# `domain/`

Framework-agnostic, provider-agnostic core. Plain TypeScript.

**Rules** (`docs/spec/03-architecture.md` §3):

- Imports **nothing** from Next.js (`next/*`, `next/headers`, React).
- Imports **nothing** provider-specific (`adapters/robinhood/*`, `adapters/crypto/*`) — depends only
  on `domain/ports/*` interfaces.
- Consumed by `src/` (app), `workers/`, and tests alike.

**Planned submodules** (populated from TASK-02 onward):

| Path | Contents | First TASK |
|---|---|---|
| `domain/ports/` | Interfaces: `IProviderAdapter`, `IPriceOracle`, `IChainReader`, `IEventSource`, … | TASK-02 |
| `domain/nffc/` | Composition rules, invariants I1–I8 | TASK-09 |
| `domain/registry/` | Asset Identity / Representation model + validation | TASK-05 |
| `domain/valuation/` | Reference NAV math | TASK-23 |
| `domain/rarity/` | Static rarity formula | TASK-14 |

Empty in TASK-01 by design — no domain code is written during the bootstrap.
