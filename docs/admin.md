# Admin (TASK-31)

"Panel de administración de activos, representaciones, fees, colecciones, reportes, salud del
sistema" (`NFFC_Development_Plan.md` v3.4 TASK-31). Depends on TASK-05 (Asset Identity &
Representation Registry) and TASK-30 (Fee Engine), both merged. Live at `/admin` and five
sub-routes.

## Acceptance

> Toda acción administrativa sensible pasa por multisig, nunca por una sola clave.

This is an **operational** fact about which address a role is granted to at deploy time
(`docs/spec/08-security-principles.md` S8: "Multisig holds `DEFAULT_ADMIN_ROLE` and every
sensitive admin role in production"), not something any client-side TypeScript can enforce
against a contract that doesn't exist yet. No code here can verify "is the connected wallet a
multisig" in a way that's meaningful before TASK-36 deploys real contracts with real roles granted
to a real Safe address — and even then, `hasRole(FEE_ADMIN_ROLE, address)` only tells you an
address *holds* the role, not that the address itself *is* a multisig rather than an EOA someone
mistakenly granted it to.

**What this TASK actually builds toward that criterion:** every admin write action in this panel
calls the exact real contract function ratified/built by TASK-05/09/30 (`registerAssetIdentity`,
`setAssetStatus`, `registerRepresentation`, `setRepresentationStatus`,
`setCollectionFeeParams`/`setMintFeeParams`/`setMarketplaceFeeBps`/`setRoyaltyBps`/
`setFeeRecipient`) — every one of them already `REGISTRY_ADMIN_ROLE`/`FEE_ADMIN_ROLE`-gated
on-chain, so whichever address actually signs is whichever address was granted the role, multisig
or not; the *contract* is what enforces the "who," this panel just calls it. `MultisigBanner`
(shown on every `/admin/*` page) makes the operational requirement explicit and visible, rather
than the panel silently implying "anyone who can sign is fine." **TASK-40's mainnet gate**
(`docs/spec/08-security-principles.md`: "multisig on every admin function") is where this
requirement is actually verified, against a real deployment — that's an ops/deployment audit, not
a TypeScript unit test.

## The six facets, and how each maps to what already exists

| Facet | Route | Backed by |
|---|---|---|
| Activos | `/admin/assets` | `AssetIdentityRegistry.sol` (TASK-05) |
| Representaciones | `/admin/representations` | `RepresentationRegistry.sol` (TASK-05) |
| Fees | `/admin/fees` | `FeeConfig.sol` (TASK-30) |
| Colecciones | `/admin/collections` | Indexed `IndexedNffcSummary[]` (TASK-20), grouped protocol-wide |
| Reportes | `/admin/reports` | Same indexed NFFC + activity data (TASK-20/26), aggregated |
| Salud del sistema | `/admin` (dashboard) | `infra/health.ts.checkHealth()` (TASK-04) — **real, not a fixture** |

System health is the one facet with something genuinely live to show today, deployed contracts or
not — everything else follows this codebase's established forward-dependency pattern: real domain
logic and real UI, fed by an honest fixture (`src/lib/admin/fixture-registry.ts`,
`fixture-fee-config.ts`) until TASK-36 deploys.

## Domain layer (`domain/admin/admin.ts`)

Two pure, tested pieces — everything else the panel shows is a direct read of an existing type
(`AssetIdentity`/`Representation`, TASK-02/05) or a direct pass-through of `HealthReport`
(TASK-04), not worth a new wrapper:

- **`listAllCollections`** — every collection with at least one indexed NFFC, protocol-wide (not
  filtered to one wallet, unlike `domain/profile/profile.ts`'s own collections facet, TASK-27).
- **`buildProtocolReport`** — total NFFCs/collections, segment counts (only segments actually
  present, never a fabricated zero row), active listing count, and total `SALE` volume — a pure
  aggregation over the exact same `IndexedNffcSummary[]`/`ActivityEntry[]` shapes every other read
  surface in this codebase already composes (TASK-20/21/24/26), a third query over existing data,
  not a new source.

Both fully unit-tested (7 tests).

## Write actions — one honest fixture pattern, reused everywhere

Every write button/form in this panel uses `useWriteFlow` (`src/lib/wallet/use-write-flow.ts` —
relocated and renamed in this TASK from TASK-29's `useMarketplaceActionFlow`, once admin writes
needed the identical simulate→sign→submit→confirm shape too; originally TASK-20's `useBuyFlow`).
Each action's `simulate` fixture honestly rejects with "X is not deployed yet (TASK-36)" — the
same live-provable "the wallet is never engaged" property every marketplace/offer action in this
codebase already establishes.

- **`StatusToggleButton`** — one component for both `setAssetStatus` and
  `setRepresentationStatus` (Activate/Deactivate), reused rather than duplicated.
- **`FeeCurveForm`** — one component for both `setCollectionFeeParams` and `setMintFeeParams`,
  parameterized by a `kind` discriminant rather than duplicated.
- **`RegisterAssetForm`**, **`RegisterRepresentationForm`**, **`MarketplaceFeeForm`**,
  **`FeeRecipientForm`**, **`RoyaltyForm`** — one each, since each has a genuinely distinct field
  shape.

## Deliberate scope trims (not gaps — documented choices)

- **No pause/unpause controls.** `PAUSER_ROLE`'s pause/unpause exists on `NFFC.sol`,
  `Collection.sol`, and `Marketplace.sol`, but "pausing" isn't one of the six facets the objective
  literally names (activos, representaciones, fees, colecciones, reportes, salud del sistema) —
  left out to keep this TASK's scope matching its own stated objective exactly, not silently
  dropped.
- **No `updateOracleMetadata` form.** Registering a representation already sets its initial oracle
  metadata; updating it later is a real but less common admin action, deferred to keep
  `RegisterRepresentationForm` from growing an even larger field set. See KNOWN ISSUES,
  `docs/reports/TASK-31-REPORT.md`.
- **Collections are view-only.** `Collection.sol` has no admin-specific collection mutation beyond
  pause (already out of scope above) — `setCollectionMetadata` is owner-gated, not admin-gated, so
  it belongs to a creator-facing surface, not this panel.

## What's still deferred

- No live contracts — same TASK-36 blocker every write surface in this codebase shares.
- `docs/OPEN_ISSUES.md` Issue #12: this session had been citing "TASK-31" for "contracts not
  deployed yet" throughout TASK-18–30 — the correct number is TASK-36 (Testnet Deployment); TASK-31
  is this TASK (Admin). Fixed in every file this TASK touches regardless of reason
  (`src/components/market/buy-button.tsx`, `src/components/nffc/make-offer-form.tsx`,
  `src/components/nffc/offer-row-actions.tsx`, `docs/marketplace-ui.md`, `docs/offers.md`, and
  three citations inside `docs/OPEN_ISSUES.md` itself); the remaining ~20 files are logged, not
  swept unilaterally — see the issue for the exact list and why.
