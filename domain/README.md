# `domain/`

Framework-agnostic, provider-agnostic core. Plain TypeScript, no runtime dependencies.

**Boundaries** (enforced by ESLint — `docs/conventions.md` §1): imports nothing from `next`,
`react`, `adapters/`, `src/`, `workers/`, or `config/`. Depends only on itself.

## Layout (TASK-02)

| Path | Contents | Fleshed out in |
|---|---|---|
| `shared/branded.ts` | Nominal id/time/address types | — |
| `registry/types.ts` | `AssetIdentity`, `Provider`, `Network`, `Representation`, `OracleMetadata` | TASK-05 |
| `nffc/composition.ts` | `Component`, `Composition`, `CompositionSegment`, invariant constants (`BPS_TOTAL`, `MIN/MAX_COMPONENTS`) | TASK-09 |
| `pricing/types.ts` | `NormalizedPrice`, `PriceSource` | TASK-22 |
| `valuation/types.ts` | `ReferenceNav`, `NavPoint`, performance windows | TASK-23 |
| `rarity/types.ts` | `StaticRarity`, `StaticRarityInputs` | TASK-14 |
| `ports/` | `Clock`, `ChainReader`, `BlockchainEventSource`, `PriceOracle`, `ProviderAdapter` | implementations live in `adapters/` + `workers/` per their TASKS |
| `index.ts` | Public barrel | — |

TASK-02 defines the **types and interfaces only**. Validators (I1–I8), NAV math, and the rarity
formula are added by the TASKS above.
