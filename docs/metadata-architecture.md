# Metadata Architecture

Companion to `docs/spec/` — the code-level contract for NFFC metadata. Established in TASK-11
(`NFFC_Development_Plan.md` v3.2). Implementation: `domain/metadata/metadata.ts`,
`src/app/api/nffc/[tokenId]/{metadata,market}/route.ts`.

An NFFC's data splits into **two layers that never mix**:

| | Static metadata | Dynamic market data |
|---|---|---|
| Examples | composition, art, segment, static rarity, mint-condition trait | Reference NAV, per-component prices, performance windows |
| Authored | once, at mint | recomputed on every read |
| Stored | content-addressed (IPFS/Arweave); `NFFC.staticMetadataURI` points at it | not stored as truth — Postgres/Redis cache only |
| Mutable | **never** | inherently volatile |
| Source of truth | the pinned document + chain state | the oracle, at read time |
| Endpoint | `GET /api/nffc/[tokenId]/metadata` (mirror of the pinned bytes) | `GET /api/nffc/[tokenId]/market` |
| `Cache-Control` | `public, max-age=31536000, immutable` | `no-store` |

---

## 1. Static metadata

### Schema (`nffc.static.v1`)

Standard ERC-721 / OpenSea fields — `name`, `description`, `image`, `external_url`, `attributes` —
plus an `nffc` block mirroring the on-chain facts so a verifier needs **only this file and an RPC
node**:

```jsonc
{
  "schema": "nffc.static.v1",
  "name": "Blue Chips #1",
  "description": "An NFFC — an immutable, weighted composition of 2 verified on-chain asset representations. Reference values are provided separately and are not part of this metadata.",
  "image": "ipfs://<art-cid>",
  "external_url": "https://<app>/nffc/1",
  "attributes": [
    { "trait_type": "Segment", "value": "MIXED" },
    { "trait_type": "Components", "value": 2, "display_type": "number" },
    { "trait_type": "NVDA", "value": 60, "display_type": "boost_percentage" },
    { "trait_type": "BTC", "value": 40, "display_type": "boost_percentage" }
  ],
  "nffc": {
    "tokenId": "1",
    "collectionId": "0",
    "compositionHash": "0x…",          // == NFFC.getCompositionHash(1)
    "segment": "MIXED",                 // == NFFC.getSegment(1)
    "componentCount": 2,
    "components": [
      { "position": 0, "assetId": "0x…", "assetSymbol": "NVDA", "assetClass": "EQUITY",
        "providerId": "ROBINHOOD", "representationId": "0x…", "weightBps": 6000 },
      { "position": 1, "assetId": "0x…", "assetSymbol": "BTC", "assetClass": "CRYPTO",
        "providerId": "CRYPTO_NATIVE", "representationId": "0x…", "weightBps": 4000 }
    ],
    "mintedAtBlock": 12345,
    "staticRarity": null,               // TASK-14
    "mintConditionTrait": null          // TASK-13
  }
}
```

`buildStaticNffcMetadata(input)` assembles this from on-chain facts. It is **pure and
deterministic**: the same facts serialize byte-identically through `serializeStaticMetadata`
(recursively key-sorted, whitespace-free) — those are the exact bytes pinned, and the content id
(CIDv1 / sha-256) is taken over them by the pinning layer (art worker / indexer), not by the domain.

### Immutability

- Authored once during the mint flow (TASK-17) / by the art worker (TASK-12); pinned; the CID goes
  into `NFFC.staticMetadataURI` and `NFFC.sol` has no setter for it.
- `staticRarity` / `mintConditionTrait` are filled from **on-chain-derived values computed at mint**
  (TASK-14 / TASK-13), never from market data. Until those TASKs land they are `null`.
- No attribute is ever a price or a NAV — `verifyStaticMetadataAgainstChain` rejects a document
  whose `trait_type` reads as market data.

### Independent verification (acceptance #1)

`verifyStaticMetadataAgainstChain(meta, chain)` takes the pinned document and the result of
`NFFC.getComposition` / `getCompositionHash` / `getSegment` and returns `{ ok, mismatches[] }`. It
checks tokenId, composition hash, segment, component count, and every component's
`assetId` / `representationId` / `weightBps` / position, and that the weights sum to 10 000. **No
backend, database, or indexer is involved** — an RPC endpoint is sufficient.

For a hash-level check, `canonicalComponentTuples(facts)` yields the
`(bytes32, bytes32, uint16)[]` tuples in on-chain order; `keccak256(abi.encode(...))` of that must
equal `compositionHash`.

## 2. Dynamic market data

`NffcMarketSnapshot` — `referenceNav`, per-component `prices`, `performance`, `asOf`, `degraded`,
optional `unavailableReason`. Every datum is a `MarketDataPoint` carrying `value`, `source` (e.g.
`chainlink:0x…`), `observedAt` (oracle `updatedAt`), and `stale`.

Rules (acceptance #2 — volatile data is never permanent truth):

- Recomputed on read from the oracle + indexed `price_point` rows (`docs/spec/09-data-model.md` §1).
  Postgres/Redis only **cache** it; the snapshot is fully rebuildable from oracle history.
- Never written into the static metadata, never used to gate a transaction, never cached as an HTTP
  response (`Cache-Control: no-store`).
- Labelled **"Reference NAV"**, never bare "value" (`docs/spec/07-ux-map.md` §6). Stale or missing
  component prices set `degraded: true`; the UI shows an explicit unavailable/stale state rather
  than a bare number.
- The NAV and price engines are TASK-22 / TASK-23. Until they are deployed the endpoint returns a
  well-formed snapshot with `unavailableReason` set (HTTP 200).

## 3. Downstream

| TASK | Uses this |
|---|---|
| 12 (art) | writes `image`; pins the document |
| 13 / 14 | fill `mintConditionTrait` / `staticRarity` |
| 17 (create wizard) | builds + previews the static metadata before mint |
| 21 (detail page) | renders static metadata + calls the market endpoint |
| 22 / 23 | implement the market snapshot |
| 24 (indexer) | mirrors static metadata into `nffc.static_metadata_uri`; never treats market data as canonical |
