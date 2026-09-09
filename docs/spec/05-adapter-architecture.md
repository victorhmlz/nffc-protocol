# 05 — Adapter Architecture

**Source intent:** `NFFC_Whitepaper.md` v1.1 §5, §7; `NFFC_Roadmap.md` v1.1 Fase 05, Fase 16;
`NFFC_Development_Plan.md` v3.2 TASK-05, TASK-06, TASK-07, TASK-22, TASK-47;
`NFFC_Claude_Master_Prompt.md` v2.1 Rules 1 and 2.

---

## 1. The pattern

```
        domain/ports/IProviderAdapter          ← the ONLY thing the domain knows
                     ▲
        ┌────────────┼─────────────┐
        │            │             │
 RobinhoodAdapter  CryptoAdapter  (future: TASK-47)
        │            │
        │            │  each: on-chain adapter contract + off-chain sync worker
        ▼            ▼
   RepresentationRegistry  ← single shared registry, provider-scoped authorization
        ▲
        │  read by
        ▼
   NFFC.sol · Price Engine · valuation · UI
```

Every provider is integrated the same way:

1. An **on-chain adapter contract** implementing `IProviderAdapter` (`04-contract-interfaces.md` §3),
   holding `ADAPTER_ROLE` scoped to its own `providerId`.
2. An **off-chain sync worker** that pulls the provider's official, active representation list,
   verifies contract addresses, and upserts rows via the adapter.
3. Rows land in the **one shared** `RepresentationRegistry`. There is no per-provider registry and no
   per-provider branch in the NFFC core.

## 2. Robinhood and Crypto are peers

`NFFC_Claude_Master_Prompt.md` v2.1: *"Robinhood y el adapter cripto son los dos primeros adapters,
con paridad de tratamiento — ninguno es 'el principal'."*

- Both implement the identical `IProviderAdapter` interface, unchanged.
- Both write to the same registry with the same validation.
- The NFFC core, the Price Engine, the NAV Engine, and every UI layer above the Price Engine treat a
  component the same whether its Representation's provider is `ROBINHOOD` or `CRYPTO_NATIVE`
  (`NFFC_Development_Plan.md` TASK-22 acceptance: "sin lógica condicional por tipo de activo en las
  capas superiores").
- The **only** places `providerId` / `assetClass` legitimately influence behavior:
  - **Segmentation** (TASK-08): deriving `CRYPTO_ONLY` / `STOCK_ONLY` / `MIXED`.
  - **UX disclosure** (`07-ux-map.md`): showing the geographic-eligibility difference for
    compositions containing ≥1 Stock Token (`NFFC_Whitepaper.md` §14).
  - Neither of these is in the NFFC core or the valuation math.

## 3. Verification — no arbitrary addresses

A Representation is admitted only when the sync worker + adapter have established that the address is
the provider's official token for that Asset Identity on Chain ID 4663:

| Check | Robinhood adapter | Crypto adapter |
|---|---|---|
| Address comes from the provider's own authoritative source | Robinhood official Stock Token list | Curated verified list (e.g. canonical WBTC/WETH or homologues on 4663) |
| Address is a contract, correct token standard, expected `decimals` | yes | yes |
| Asset Identity exists and is `ACTIVE` | yes | yes |
| Oracle metadata (Chainlink feed, heartbeat, decimals) resolvable | yes | yes |
| `providerId` matches the adapter's own scope | yes | yes |

A user typing an address into the create wizard can **never** cause registration
(`NFFC_Claude_Master_Prompt.md` v2.1 Rule 2). The wizard only selects from already-registered
`ACTIVE` representations.

## 4. Synced fields (per Representation)

From `NFFC_Development_Plan.md` TASK-06 / TASK-07 and `02-domain-model.md` §2.4:

`symbol`, `name`, `token` (contract address), `chainId`, `status`, `decimals`, `multiplier`,
`oracleMetadata` (feed address, heartbeat, feed decimals), `createdAt`, `updatedAt`.

## 5. Sync worker responsibilities

- Runs **outside** the Next.js request cycle (`03-architecture.md` §4).
- Idempotent: re-running a sync produces no duplicate rows and no spurious status flips.
- **Tolerates new assets**: a provider adding a token results in a new `Representation` row with no
  contract redeploy and no core change (`NFFC_Development_Plan.md` TASK-06 acceptance).
- **Auto-deactivation**: a representation the provider delists is set `INACTIVE` automatically
  (TASK-06 acceptance). Existing NFFCs keep their immutable composition; valuation of that component
  must degrade gracefully (show last known + staleness, not a crash) — defined in TASK-22/TASK-23.
- Emits structured logs and metrics for observability (TASK-39).
- Never holds secrets in the repo; provider API credentials come from environment config.

## 6. Price path

- The Price Engine (TASK-22) obtains a normalized price for a Representation via
  `IProviderAdapter.readPrice` + the registry's `OracleMetadata`, producing
  `{ raw, normalized, decimals, timestamp, source, multiplier }`.
- Chainlink is the sole source in V1 for both providers.
- Staleness: if `now - updatedAt > heartbeat` (plus a configured grace), the price is flagged stale;
  consumers must display the staleness, and NAV must mark the affected window as degraded rather than
  silently using an old number.
- The data contract is provider-of-oracle-agnostic so a second oracle can be added later without
  breaking consumers (TASK-22 acceptance).

## 7. Adding a third provider (TASK-47) — the test of the design

To add provider `X` with **zero** changes to `NFFC.sol` or the domain:

1. Register the new `providerId = "X"` (registry admin).
2. Deploy `XAdapter` implementing `IProviderAdapter`, granted `ADAPTER_ROLE` scoped to `"X"`.
3. Stand up the `X` sync worker; it verifies addresses and upserts representations.
4. New representations become selectable in the create wizard automatically; the Price Engine values
   them through the same path.

If any of these steps would require editing the NFFC core, the registry interface, or the valuation
math, the abstraction is broken and the change must stop and go back to the Project Lead
(`NFFC_Development_Plan.md` TASK-05 / TASK-47).

## 8. What adapters must **not** do

- Must not expose provider-specific types to the domain or the UI above the Price Engine.
- Must not write to any store other than through the shared registry (+ their own worker bookkeeping).
- Must not grant themselves authority over another provider's representations.
- Must not implement custody, transfers of user assets, or price computation of their own invention —
  price comes from the oracle, normalized by the Price Engine.
