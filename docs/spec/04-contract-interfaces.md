# 04 — Contract Interfaces (Specification Only)

**Source intent:** `NFFC_Whitepaper.md` v1.1 §9, §10; `NFFC_Development_Plan.md` v3.2 TASK-05,
TASK-06, TASK-07, TASK-09, TASK-10, TASK-19, TASK-30; `NFFC_Roadmap.md` v1.1 Fase 05–07, 13, 24.

> **This is a specification, not code.** The snippets below are Solidity-like pseudocode to fix
> function shapes, events, custom errors, roles, and invariants. No implementation bodies. No
> `.sol` files are created in TASK-00. Real contracts are implemented in the TASKS noted per
> interface. Where a signature detail is genuinely undecided, it is marked `// OPEN`.

## Conventions

- Solidity ^0.8.x, OpenZeppelin (`AccessControl`, `Pausable`, `ReentrancyGuard`, `ERC721`).
- **Custom errors**, not `require` strings.
- **Checks-Effects-Interactions** everywhere value moves.
- **No `tx.origin`.** No custom cryptography.
- Every state-changing admin path is behind a role; production role admin is a **multisig**
  (`08-security-principles.md`).
- Weights are `uint16` basis points; `BPS_TOTAL = 10_000`.

## Roles (shared vocabulary)

| Role | Granted to | Powers |
|---|---|---|
| `DEFAULT_ADMIN_ROLE` | Multisig | Grants/revokes all other roles |
| `REGISTRY_ADMIN_ROLE` | Multisig | Create/deactivate Asset Identities and Representations |
| `ADAPTER_ROLE` | Adapter contracts / their sync signer | Propose representation upserts and status changes for their own provider |
| `FEE_ADMIN_ROLE` | Multisig | Change fee parameters |
| `PAUSER_ROLE` | Multisig / ops | Pause/unpause guarded contracts |

---

## 1. `IAssetIdentityRegistry` — TASK-05

```solidity
interface IAssetIdentityRegistry {
    enum AssetStatus { INACTIVE, ACTIVE }

    struct AssetIdentity {
        bytes32 assetId;        // opaque, stable; NOT an address
        string  symbol;         // "NVDA", "BTC"
        string  name;
        bytes32 assetClass;     // "EQUITY", "CRYPTO" — descriptive only
        AssetStatus status;
    }

    event AssetIdentityRegistered(bytes32 indexed assetId, string symbol, bytes32 assetClass);
    event AssetIdentityStatusChanged(bytes32 indexed assetId, AssetStatus status);

    error AssetAlreadyExists(bytes32 assetId);
    error UnknownAsset(bytes32 assetId);
    error NotAuthorized();

    function registerAssetIdentity(
        string calldata symbol,
        string calldata name,
        bytes32 assetClass
    ) external returns (bytes32 assetId);            // REGISTRY_ADMIN_ROLE

    function setAssetStatus(bytes32 assetId, AssetStatus status) external; // REGISTRY_ADMIN_ROLE

    function getAssetIdentity(bytes32 assetId) external view returns (AssetIdentity memory);
    function isActiveAsset(bytes32 assetId) external view returns (bool);
}
```

**Invariants:** `assetId` unique and immutable once created; `assetClass` never drives privileged
logic anywhere; only `REGISTRY_ADMIN_ROLE` mutates.

---

## 2. `IRepresentationRegistry` — TASK-05

```solidity
interface IRepresentationRegistry {
    enum RepStatus { INACTIVE, ACTIVE }

    struct OracleMetadata {
        address feed;           // Chainlink aggregator on chain 4663
        uint32  heartbeat;      // seconds; max acceptable staleness
        uint8   feedDecimals;
    }

    struct Representation {
        bytes32 representationId;
        bytes32 assetId;        // FK -> IAssetIdentityRegistry
        bytes32 providerId;     // "ROBINHOOD", "CRYPTO_NATIVE"
        uint256 chainId;        // 4663 in V1
        address token;          // VERIFIED ERC-20 (or equivalent) address
        bytes32 tokenStandard;  // "ERC20"
        uint8   decimals;
        uint256 multiplier;     // scale between token unit and 1 unit underlying; 1e18 == 1.0  // OPEN: fixed-point base
        OracleMetadata oracle;
        RepStatus status;
        uint64  createdAt;
        uint64  updatedAt;
    }

    event RepresentationRegistered(
        bytes32 indexed representationId,
        bytes32 indexed assetId,
        bytes32 indexed providerId,
        address token,
        uint256 chainId
    );
    event RepresentationStatusChanged(bytes32 indexed representationId, RepStatus status);
    event RepresentationOracleUpdated(bytes32 indexed representationId, OracleMetadata oracle);

    error RepresentationAlreadyExists(bytes32 representationId);
    error UnknownRepresentation(bytes32 representationId);
    error AssetNotActive(bytes32 assetId);
    error UnverifiedToken(address token);
    error ProviderMismatch();
    error NotAuthorized();

    // Only callable by REGISTRY_ADMIN_ROLE or an ADAPTER_ROLE holder acting for its own providerId.
    function registerRepresentation(Representation calldata rep) external returns (bytes32 representationId);
    function setRepresentationStatus(bytes32 representationId, RepStatus status) external;
    function updateOracleMetadata(bytes32 representationId, OracleMetadata calldata oracle) external;

    function getRepresentation(bytes32 representationId) external view returns (Representation memory);
    function isActiveRepresentation(bytes32 representationId) external view returns (bool);
    function resolvesTo(bytes32 representationId, bytes32 assetId) external view returns (bool);
}
```

**Invariants:**
- A Representation can be admitted only for an `ACTIVE` Asset Identity and a token the registry
  treats as verified. A raw user-supplied address never becomes supported
  (`NFFC_Claude_Master_Prompt.md` v2.1 Rule 2).
- An `ADAPTER_ROLE` holder may only touch representations whose `providerId` matches its own.
- Adding a **new provider** requires no change to this interface or to `NFFC` — only new rows and a
  new adapter (`NFFC_Development_Plan.md` TASK-05 acceptance).

---

## 3. `IProviderAdapter` — TASK-06 (Robinhood), TASK-07 (Crypto)

One interface, two implementations, **no hierarchy** between them.

```solidity
interface IProviderAdapter {
    function providerId() external view returns (bytes32);

    // Off-chain sync worker calls these (holder of ADAPTER_ROLE); they forward into the
    // RepresentationRegistry with provider-scoped authorization.
    function upsertRepresentation(IRepresentationRegistry.Representation calldata rep) external;
    function deactivateRepresentation(bytes32 representationId) external;   // e.g. provider delisted it

    // View used by the Price Engine / valuation to fetch a normalized price for a representation.
    function readPrice(bytes32 representationId)
        external
        view
        returns (uint256 normalizedPrice, uint8 priceDecimals, uint64 updatedAt, address source);

    event ProviderRepresentationSynced(bytes32 indexed representationId, uint64 at);
    event ProviderRepresentationDeactivated(bytes32 indexed representationId, uint64 at);

    error StalePrice(bytes32 representationId, uint64 updatedAt);
    error NoOracleForRepresentation(bytes32 representationId);
}
```

**Invariants:** the Crypto adapter reuses this interface unchanged; the NFFC core never imports a
concrete adapter (`NFFC_Development_Plan.md` TASK-07 acceptance). `readPrice` never returns a value
without `updatedAt` and `source`.

---

## 4. `INFFC` — ERC-721 core — TASK-09

```solidity
interface INFFC /* is IERC721, IERC721Metadata */ {
    struct Component {
        bytes32 assetId;
        bytes32 representationId;
        uint16  weightBps;      // > 0
    }

    struct MintParams {
        uint256 collectionId;
        Component[] components;  // length 1..20
        string  staticMetadataURI; // points to immutable metadata (composition + art + traits)
    }

    event NFFCMinted(
        uint256 indexed tokenId,
        uint256 indexed collectionId,
        address indexed creator,
        bytes32 compositionHash,   // keccak of the canonical encoded composition
        uint16  componentCount
    );
    event NFFCCompositionRecorded(uint256 indexed tokenId, Component[] components);

    error InvalidComponentCount(uint256 count);          // I1
    error WeightSumNot10000(uint256 sum);                // I2
    error DuplicateAsset(bytes32 assetId);               // I3
    error ZeroWeight(bytes32 assetId);                   // I4
    error RepresentationNotActive(bytes32 representationId); // I5
    error RepresentationAssetMismatch(bytes32 representationId, bytes32 assetId); // I6
    error CompositionIsImmutable();                      // I7

    function mint(MintParams calldata params) external payable returns (uint256 tokenId);

    function getComposition(uint256 tokenId) external view returns (Component[] memory);
    function getCompositionHash(uint256 tokenId) external view returns (bytes32);
    function getSegment(uint256 tokenId) external view returns (uint8); // 0 CRYPTO_ONLY,1 STOCK_ONLY,2 MIXED
    function getStaticRarity(uint256 tokenId) external view returns (uint256);
    // NOTE: there is intentionally NO setComposition / addComponent / reweight of any kind.
}
```

**Invariants:** I1–I8 from `02-domain-model.md` §4, enforced in `mint`, with the noted edge-case
tests. Composition storage is write-once. `payable` because the **mint fee** (`06-fee-model.md`) is
collected here; exact fee routing is `IFeeConfig` + `06`. Segment and static rarity are computed at
mint from the composition, never set by the caller.

---

## 5. `ICollection` — TASK-10

```solidity
interface ICollection {
    struct CreateParams {
        string name;
        string metadataURI;
        uint16 expectedComponentCount; // used only for fee quoting; not a cap
    }

    event CollectionCreated(uint256 indexed collectionId, address indexed creator, string name);
    event CollectionMetadataUpdated(uint256 indexed collectionId, string metadataURI);

    error NotCollectionOwner(uint256 collectionId, address caller);
    error CollectionCreationFeeNotMet(uint256 provided, uint256 required);

    function createCollection(CreateParams calldata params) external payable returns (uint256 collectionId);
    function quoteCollectionCreationFee(uint16 componentCount) external view returns (uint256);
    function ownerOfCollection(uint256 collectionId) external view returns (address);
    function setCollectionMetadata(uint256 collectionId, string calldata metadataURI) external; // owner only
}
```

**Invariants:** the creation fee is read from `IFeeConfig` on-chain, never hardcoded; changing it
requires no NFFC redeploy (`NFFC_Development_Plan.md` TASK-10 acceptance).

---

## 6. `IMarketplace` — TASK-19

```solidity
interface IMarketplace /* uses ReentrancyGuard, Pausable */ {
    struct Listing {
        uint256 tokenId;
        address seller;
        uint256 price;          // in chain native (ETH) unless a quote token is later added // OPEN
        uint64  createdAt;
        bool    active;
    }

    struct Offer {
        uint256 offerId;
        uint256 tokenId;
        address buyer;
        uint256 price;
        uint64  expiry;         // unix seconds; strictly enforced on-chain
        bool    active;
    }

    event ListingCreated(uint256 indexed tokenId, address indexed seller, uint256 price);
    event ListingCancelled(uint256 indexed tokenId, address indexed seller);
    event Sale(uint256 indexed tokenId, address indexed seller, address indexed buyer, uint256 price, uint256 feePaid, uint256 royaltyPaid);
    event OfferCreated(uint256 indexed offerId, uint256 indexed tokenId, address indexed buyer, uint256 price, uint64 expiry);
    event OfferCancelled(uint256 indexed offerId);
    event OfferAccepted(uint256 indexed offerId, uint256 indexed tokenId, address seller, address buyer, uint256 price);

    error NotTokenOwner(uint256 tokenId, address caller);
    error ListingNotActive(uint256 tokenId);
    error PriceMismatch(uint256 sent, uint256 price);
    error OfferExpired(uint256 offerId, uint64 expiry);
    error OfferNotActive(uint256 offerId);
    error CannotCancelOthersListing();

    function createListing(uint256 tokenId, uint256 price) external;               // token owner
    function cancelListing(uint256 tokenId) external;                              // seller only
    function buy(uint256 tokenId) external payable;                               // CEI + nonReentrant
    function createOffer(uint256 tokenId, uint64 expiry) external payable returns (uint256 offerId);
    function cancelOffer(uint256 offerId) external;                               // buyer only
    function acceptOffer(uint256 offerId) external;                              // token owner; reverts if expired
}
```

**Invariants (with explicit tests — TASK-19 acceptance):**
- Reentrancy protection on every value-moving path, verified by dedicated tests.
- A non-owner can never cancel a listing, under any tested condition.
- An expired offer is not acceptable on-chain even if the UI is stale (`NFFC_Development_Plan.md`
  TASK-29 acceptance).
- Fees and royalties are computed from `IFeeConfig` and paid out atomically in `buy` / `acceptOffer`.

---

## 7. `IFeeConfig` — TASK-30

```solidity
interface IFeeConfig {
    // All getters return current on-chain configuration. Frontend reads these; never hardcodes.
    function collectionCreationFee(uint16 componentCount) external view returns (uint256);
    function mintFee(uint16 componentCount) external view returns (uint256);
    function marketplaceFeeBps() external view returns (uint16);
    function royaltyBps(uint256 collectionId) external view returns (uint16);
    function feeRecipient() external view returns (address);

    event CollectionFeeParamsChanged(bytes params);   // shape defined in TASK-30
    event MintFeeParamsChanged(bytes params);
    event MarketplaceFeeChanged(uint16 bps);
    event RoyaltyChanged(uint256 indexed collectionId, uint16 bps);
    event FeeRecipientChanged(address recipient);

    error FeeOutOfBounds();      // e.g. marketplaceFeeBps > hard cap
    error NotFeeAdmin();

    // FEE_ADMIN_ROLE (multisig) only:
    function setCollectionFeeParams(bytes calldata params) external;
    function setMintFeeParams(bytes calldata params) external;
    function setMarketplaceFeeBps(uint16 bps) external;
    function setRoyaltyBps(uint256 collectionId, uint16 bps) external;
    function setFeeRecipient(address recipient) external;
}
```

**Invariants:** every fee is a parameter, not a constant; the fee curves as a function of
`componentCount` are configurable; a hard on-chain cap bounds `marketplaceFeeBps`; changing any fee
is an admin transaction, never a frontend deploy (`NFFC_Development_Plan.md` TASK-30 acceptance).
Exact curve encoding in `params` is a TASK-30 decision — see `06-fee-model.md`.

---

## 8. Interface → implementing TASK map

| Interface | Implemented in | Notes |
|---|---|---|
| `IAssetIdentityRegistry` | TASK-05 | `AssetIdentityRegistry.sol` |
| `IRepresentationRegistry` | TASK-05 | `RepresentationRegistry.sol` |
| `IProviderAdapter` (Robinhood) | TASK-06 | `RobinhoodAdapter.sol` + off-chain sync worker |
| `IProviderAdapter` (Crypto) | TASK-07 | `CryptoAdapter.sol` + off-chain sync worker; same interface |
| `INFFC` | TASK-09 | `NFFC.sol` (ERC-721) |
| `ICollection` | TASK-10 | `Collection.sol` |
| `IMarketplace` | TASK-19 | `Marketplace.sol` (`ReentrancyGuard`, `Pausable`) |
| `IFeeConfig` | TASK-30 | `FeeConfig.sol` (`FEE_ADMIN_ROLE` = multisig) |
| oracle read path | TASK-22 | Price Engine consumes `IProviderAdapter.readPrice` + registry `OracleMetadata` |

## 9. Deliberately deferred contract surface

- **Vault / custody interfaces** — V2, blocked by design (`10-version-boundaries.md`).
- **Native token (ERC-20) + governance** — V1.5, TASK-43/44, not defined here.
- **Second oracle provider** — data contract in TASK-22 must allow it; no interface here.
