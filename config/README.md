# `config/`

Typed, environment-keyed configuration: chain parameters (Robinhood Chain 4663), contract
addresses/ABIs, RPC endpoints, database/cache connection settings, log level.

- **No secrets in the repo.** Values come from the environment; `.env.example` documents every
  variable (`docs/spec/03-architecture.md` §7).
- Consumed by `src/`, `workers/`, and `adapters/`. Not imported by `domain/`.

Populated from TASK-04 onward. Empty in TASK-01 by design.
