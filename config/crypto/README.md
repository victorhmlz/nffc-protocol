# `config/crypto/`

Seed data for the native-crypto sync worker (`workers/crypto-sync/`). Same shape and rules as
`config/robinhood/` — see that README.

| File                         |                                                                                                                                                |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `native-tokens.example.json` | Committed. Placeholder addresses.                                                                                                              |
| `native-tokens.json`         | **Git-ignored.** Copy the example; fill in the verified wrapped/homolog token addresses (WBTC/WETH per the network) and their Chainlink feeds. |

`token` must be an explicitly verified contract address — no crypto asset is added without it
(`docs/spec/05-adapter-architecture.md`; TASK-07 acceptance).
