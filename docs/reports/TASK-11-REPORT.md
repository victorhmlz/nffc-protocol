# TASK 11 REPORT

## STATUS

COMPLETED

`pnpm verify` (lint · typecheck · test · build) green locally — **20 files, 75 tests** (56 → +19).
`pnpm contracts:build` / `pnpm contracts:test` green (92 Solidity tests, unchanged — no `.sol`
touched). See PULL REQUEST for CI.

## OBJECTIVE

Separate an NFFC's **static** metadata (composition, art, traits) from its **dynamic** market data
(price, NAV): a standard ERC-721 metadata schema plus a dynamic layer served only by the API and
never stored as permanent on-chain truth (`NFFC_Development_Plan.md` v3.2 TASK-11;
`docs/spec/09-data-model.md` §1; `docs/spec/07-ux-map.md` §5–6).

## CHANGES

### `domain/metadata/metadata.ts` (new) — first real logic in a new domain module

- **Static schema `nffc.static.v1`** — `StaticNffcMetadata` = the ERC-721 / OpenSea fields (`name`,
  `description`, `image`, `external_url`, `attributes`) **plus** an `nffc` block
  (`StaticNffcFacts`) mirroring the on-chain facts (`tokenId`, `collectionId`, `compositionHash`,
  `segment`, `componentCount`, per-component `assetId` / `assetSymbol` / `assetClass` / `providerId`
  / `representationId` / `weightBps`, `mintedAtBlock`, and `staticRarity` / `mintConditionTrait`
  left `null` for TASK-14 / TASK-13).
- **`buildStaticNffcMetadata(input)`** — pure, deterministic: on-chain facts → the document.
  Attributes are `Segment`, `Components`, one `boost_percentage` per component, and
  `Static Rarity` / `Mint · …` once populated.
- **`serializeStaticMetadata(meta)`** — canonical form: recursively key-sorted, whitespace-free.
  These are the exact bytes to pin; the CID / sha-256 is taken over them by the pinning layer, not
  the domain (keeps `domain/` free of `node:crypto`).
- **`verifyStaticMetadataAgainstChain(meta, chain)`** → `{ ok, mismatches[] }` — checks the pinned
  document against `NFFC.getComposition` / `getCompositionHash` / `getSegment` **with no backend**:
  tokenId, composition hash, segment, count, every component field + position, weight sum = 10 000,
  and that no attribute reads as market data. `canonicalComponentTuples(facts)` exposes the
  `(bytes32,bytes32,uint16)[]` for the optional `keccak256(abi.encode(...))` hash-level check.
- **Dynamic layer** — `NffcMarketSnapshot` (`referenceNav`, per-component `prices`, `asOf`,
  `degraded`, optional `unavailableReason`); every datum is a `MarketDataPoint` carrying `value` +
  `source` + `observedAt` + `stale`. `emptyMarketSnapshot(...)` for "no data yet".
  `MARKET_DATA_NOTICE`; `STATIC_METADATA_CACHE_CONTROL` (`…, immutable`) /
  `MARKET_DATA_CACHE_CONTROL` (`no-store`) encode the split.
- Exported from the `@domain` barrel.

### `src/app/api/nffc/[tokenId]/metadata/route.ts` (new)

`GET` — the static ERC-721 document (a mirror of the pinned bytes). 400 on a non-numeric / zero
tokenId. Until the contract is deployed + indexed (TASK-21/24) there is no source, so it returns
**503** (`Cache-Control: no-store` — retryable) with a body pointing at
`NFFC.staticMetadataURI` as canonical and echoing the `immutable` cache header a real 200 would
carry.

### `src/app/api/nffc/[tokenId]/market/route.ts` (new)

`GET` — the dynamic snapshot. 400 on a bad tokenId; otherwise **200** with a well-formed
`NffcMarketSnapshot` (`referenceNav: null`, `components: []`, live `asOf`, `degraded: true`,
`unavailableReason` → TASK-22/23) plus `notice: MARKET_DATA_NOTICE`. `Cache-Control: no-store`
always — dynamic data is never cached as a response.

### `docs/metadata-architecture.md` (new)

The code-level contract: the two-layer table, the `nffc.static.v1` schema with a JSON example, the
immutability + independent-verification model, the dynamic-layer rules, and the downstream-TASK map.

### Docs

`README.md` — status line + doc link.

## FILES CREATED

```
domain/metadata/metadata.ts
domain/metadata/metadata.test.ts
src/app/api/nffc/[tokenId]/metadata/route.ts
src/app/api/nffc/[tokenId]/metadata/route.test.ts
src/app/api/nffc/[tokenId]/market/route.ts
src/app/api/nffc/[tokenId]/market/route.test.ts
docs/metadata-architecture.md
docs/reports/TASK-11-REPORT.md
```

## FILES MODIFIED

```
domain/index.ts   export metadata module
README.md         status line + metadata-architecture link
```

Branch is based on `main` — see PULL REQUEST.

## TESTS

`pnpm test` → Vitest, **20 files, 75 tests** (19 new):

```
domain/metadata/metadata.test.ts (14)
  buildStaticNffcMetadata  ERC-721 fields + nffc mirror; attributes (segment/components/per-component
                           boost_percentage); rarity & mint-condition omitted until populated, then
                           included; deterministic byte-identical canonical serialization (key-sorted)
  canonicalComponentTuples [assetId, representationId, weightBps] in on-chain order
  verifyStaticMetadataAgainstChain  passes on a match; flags composition-hash / segment /
                           per-component weight / length mismatches; flags weights ≠ 10,000; rejects a
                           document carrying a market-data attribute
  dynamic layer            emptyMarketSnapshot shape; cache-control constants encode the split
src/app/api/nffc/[tokenId]/metadata/route.test.ts (3)  bad id → 400 no-store; id 0 → 400;
                           valid id → 503 no-store, body points at NFFC.staticMetadataURI + immutable hint
src/app/api/nffc/[tokenId]/market/route.test.ts (2)    bad id → 400; valid id → 200 no-store,
                           well-formed snapshot, degraded, unavailableReason → TASK-22/23, notice
```

`pnpm contracts:test` → **92 Solidity tests**, unchanged (TASK-11 adds no `.sol`).

## BUILD

`pnpm build` green — **7 routes** now (`/api/nffc/[tokenId]/metadata`, `/api/nffc/[tokenId]/market`
added, both dynamic). `pnpm contracts:build` — nothing to compile.

## LINT / TYPECHECK

Clean. New route handlers use the generated `RouteContext<'/api/nffc/[tokenId]/…'>` type + `await
ctx.params` (Next 16). `domain/metadata` imports only `domain/` — module-boundary rule satisfied.

## SECURITY

STEP 5 AUDIT (`docs/spec/08-security-principles.md`, `docs/spec/09-data-model.md` §1,
`NFFC_Claude_Master_Prompt.md` Rule 4):

| Concern | This TASK |
|---|---|
| **Static metadata immutable & backend-independent** (acceptance #1) | Authored once, pinned to content-addressed storage; `NFFC.sol` has no URI setter. `verifyStaticMetadataAgainstChain` validates a pinned file against chain reads alone — no DB, no indexer, no API |
| **Volatile data never permanent truth** (acceptance #2) | `NffcMarketSnapshot` is a distinct type, recomputed on read, `Cache-Control: no-store`, every point carries `source` + `observedAt`. `verifyStaticMetadataAgainstChain` *rejects* a static document that carries a price/NAV attribute |
| On-chain is the authority (Rule 4) | The `nffc` facts block duplicates chain state for convenience; the verifier treats chain as authoritative and reports any divergence as a mismatch |
| A2 — validate external input | Route handlers validate `tokenId` against `^[1-9]\d{0,77}$` before use; 400 otherwise |
| A5 — provenance on every market number | `MarketDataPoint` cannot exist without `source` + `observedAt`; `degraded` / `stale` are explicit |
| No secrets, no new runtime deps | Pure TS; `domain/metadata` pulls in nothing framework- or Node-specific |

## PERFORMANCE

`buildStaticNffcMetadata` / `serializeStaticMetadata` / `verifyStaticMetadataAgainstChain` are all
O(componentCount ≤ 20). The routes do no I/O yet. Static responses are designed for
`max-age=31536000, immutable`; market responses for `no-store`.

## KNOWN ISSUES

1. **Routes return placeholders.** There is no deployed NFFC contract or indexer, so
   `/metadata` returns 503 and `/market` returns a `unavailableReason` snapshot. Wiring the real
   read model is TASK-21 (detail page / indexer read) and TASK-22/23 (price / NAV engines); this
   TASK fixes the shapes, the verification, and the caching contract.
2. **`staticRarity` / `mintConditionTrait` are `null`.** Populated by TASK-14 / TASK-13 from
   on-chain-derived values; the schema slot and the "never market-sourced" rule are in place now.
3. **Hash-level verification is left to the caller.** `verifyStaticMetadataAgainstChain` does
   structural equality (dependency-free); recomputing `keccak256(abi.encode(components))` and
   comparing to `compositionHash` needs an ABI codec (viem), so `canonicalComponentTuples` exposes
   the tuples and the doc describes the check rather than pulling a codec into `domain/`.
4. **TASK-10 (Collection) is not on `main`.** PR #12's base was never retargeted, so it merged into
   `task/TASK-09-nffc-contract` instead of `main`; `main` (and therefore this branch) has TASK-00…09
   only. TASK-11 depends only on TASK-09, so it is unaffected and touches no file TASK-10 touches. A
   corrective PR (cherry-pick of `dc6067f` onto `main`) is needed to land TASK-10 — flagged to the
   Project Lead.

## ACCEPTANCE CRITERIA

`NFFC_Development_Plan.md` v3.2 TASK-11:

| Criterion | Status | Evidence |
|---|---|---|
| Static metadata is immutable and verifiable independently of the backend | Met | `nffc.static.v1` schema mirrors on-chain facts; `verifyStaticMetadataAgainstChain` checks a pinned document against `NFFC` views + registries with no backend; canonical serialization is byte-deterministic; served with `Cache-Control: …, immutable`. `docs/metadata-architecture.md` §1 |
| No volatile market datum is treated as a permanent source of truth | Met | `NffcMarketSnapshot` is a separate, recomputed-on-read type; `no-store`; each `MarketDataPoint` carries `source` + `observedAt` + `stale`; `verifyStaticMetadataAgainstChain` rejects a static document containing a market attribute. `docs/metadata-architecture.md` §2 |
| ERC-721 standard metadata schema + dynamic data layer served by API | Met | `StaticNffcMetadata` (`domain/metadata`); `GET /api/nffc/[tokenId]/metadata` (static) and `GET /api/nffc/[tokenId]/market` (dynamic) |

## PULL REQUEST

Branch `task/TASK-11-metadata-architecture`, based on **`main`** (TASK-00…09 + the Node chore).

**PR: https://github.com/victorhmlz/nffc-protocol/pull/13** — base `main`.

**Do not merge** — Project Lead reviews and authorizes. Note: land the TASK-10 recovery PR before
or alongside this so `main` regains the Collection contract (KNOWN ISSUES #4).

## NEXT TASK

**TASK-12 — Generative Art Engine** (`NFFC_Development_Plan.md` v3.2): a deterministic
composition → visual algorithm (shape / distribution / palette within the design system),
server-side render at mint stored on IPFS/Arweave, with public reproducible documentation. Depends
on TASK-03, TASK-09, TASK-11. Blocked until the Project Lead merges this PR and authorizes TASK-12.
