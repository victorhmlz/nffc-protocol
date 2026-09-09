# `config/robinhood/`

Seed data for the Robinhood sync worker (`workers/robinhood-sync/`).

| File                        |                                                                                |
| --------------------------- | ------------------------------------------------------------------------------ |
| `stock-tokens.example.json` | Committed. The shape the worker expects — placeholder addresses.               |
| `stock-tokens.json`         | **Git-ignored.** Copy the example and fill in real values for local / testnet. |

Each entry: `symbol`, `name`, `token` (address), `decimals`, `multiplier` (decimal string,
`"1000000000000000000"` = 1.0), `oracle` (`feed` address, `heartbeat` seconds, `feedDecimals`).

In production the source is Robinhood's official active Stock Token feed — an API or an on-chain
Robinhood registry (shape TBD). It plugs in behind `RobinhoodTokenSource` in `source.ts`; the
reconciler and worker do not change.
