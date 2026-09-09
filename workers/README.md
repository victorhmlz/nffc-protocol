# `workers/`

Long-running / scheduled processes that run **outside** the Next.js request cycle
(`docs/spec/03-architecture.md` §4).

| Worker | Purpose | First TASK |
|---|---|---|
| Blockchain indexer | Idempotent event indexing into PostgreSQL | TASK-24 |
| Representation sync (per provider) | Pull + verify provider representations | TASK-06 / TASK-07 |
| Price / NAV materialization | Normalize oracle prices, compute Reference NAV history | TASK-22 / TASK-23 |
| Art rendering pipeline | Generative art from composition | TASK-12 |

Never a long-lived Route Handler. Empty in TASK-01 by design.
