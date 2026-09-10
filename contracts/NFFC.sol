// SPDX-License-Identifier: MIT
pragma solidity 0.8.34;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {ERC721URIStorage} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

import {INFFC} from "./interfaces/INFFC.sol";
import {IAssetIdentityRegistry} from "./interfaces/IAssetIdentityRegistry.sol";
import {IRepresentationRegistry} from "./interfaces/IRepresentationRegistry.sol";
import {CompositionSegmentLib} from "./lib/CompositionSegmentLib.sol";
import {StaticRarityLib} from "./lib/StaticRarityLib.sol";

/**
 * NFFC — Non-Fungible Financial Collectible (ERC-721 core), TASK-09.
 *
 * Each token carries an immutable *composition*: 1–20 weighted components, each
 * pinning an Asset Identity and the specific Representation chosen for it at mint.
 * {mint} enforces the composition invariants I1–I8 (docs/spec/02-domain-model.md §4)
 * and there is deliberately **no** function — under any role — that can add,
 * remove, reweight, or re-point a component afterwards (I7).
 *
 * - Segment (`CRYPTO_ONLY` / `STOCK_ONLY` / `MIXED`) is derived at mint from each
 *   component's asset class via {CompositionSegmentLib}; the caller cannot pass it
 *   (docs/spec/05-adapter-architecture.md §2 sanctions asset-class use for
 *   segmentation only — it is not a per-provider branch and gates nothing).
 * - `mint` is `payable` because the mint fee is collected here
 *   (docs/spec/06-fee-model.md); routing lands with `IFeeConfig` (TASK-30). Until
 *   then it must be called with no value.
 * - Static rarity is a TASK-14 hook (returns 0 here).
 * - Collection existence / ownership is validated in TASK-10; `collectionId` is
 *   only recorded here.
 */
contract NFFC is INFFC, ERC721URIStorage, AccessControl, Pausable, ReentrancyGuard {
    using CompositionSegmentLib for bool[];

    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

    uint256 private constant MAX_COMPONENTS = 20;
    uint16 private constant BPS_TOTAL = 10_000;
    bytes32 private constant CRYPTO_CLASS = bytes32("CRYPTO");

    IAssetIdentityRegistry public immutable assetRegistry;
    IRepresentationRegistry public immutable representationRegistry;

    uint256 private _nextTokenId = 1;

    mapping(uint256 tokenId => Component[]) private _composition;
    mapping(uint256 tokenId => bytes32) private _compositionHash;
    mapping(uint256 tokenId => uint8) private _segment;
    mapping(uint256 tokenId => uint256) private _collectionId;

    constructor(address admin, address assetRegistry_, address representationRegistry_)
        ERC721("Non-Fungible Financial Collectible", "NFFC")
    {
        if (admin == address(0) || assetRegistry_ == address(0) || representationRegistry_ == address(0)) {
            revert ZeroAddress();
        }
        assetRegistry = IAssetIdentityRegistry(assetRegistry_);
        representationRegistry = IRepresentationRegistry(representationRegistry_);
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(PAUSER_ROLE, admin);
    }

    // ------------------------------------------------------------------- mint ---

    /// @inheritdoc INFFC
    function mint(MintParams calldata params)
        external
        payable
        override
        nonReentrant
        whenNotPaused
        returns (uint256 tokenId)
    {
        if (msg.value != 0) revert UnexpectedPayment();

        Component[] calldata comps = params.components;
        uint256 n = comps.length;
        if (n == 0 || n > MAX_COMPONENTS) revert InvalidComponentCount(n); // I1

        bool[] memory isCryptoNative = new bool[](n);
        uint256 sum;

        for (uint256 i; i < n; ++i) {
            Component calldata c = comps[i];

            if (c.weightBps == 0) revert ZeroWeight(c.assetId); // I4

            for (uint256 j; j < i; ++j) {
                if (comps[j].assetId == c.assetId) revert DuplicateAsset(c.assetId); // I3
            }

            // I5 — `isActiveRepresentation` is false for an unknown id, so this
            // covers "not registered" and "registered but INACTIVE" together.
            if (!representationRegistry.isActiveRepresentation(c.representationId)) {
                revert RepresentationNotActive(c.representationId);
            }

            // I6 — the representation must resolve to this component's asset.
            if (!representationRegistry.resolvesTo(c.representationId, c.assetId)) {
                revert RepresentationAssetMismatch(c.representationId, c.assetId);
            }

            isCryptoNative[i] = assetRegistry.getAssetIdentity(c.assetId).assetClass == CRYPTO_CLASS;
            sum += c.weightBps;
        }

        if (sum != BPS_TOTAL) revert WeightSumNot10000(sum); // I2

        uint8 segment = uint8(isCryptoNative.deriveSegment());
        bytes32 compositionHash = keccak256(abi.encode(comps));

        tokenId = _nextTokenId++;

        // effects — composition storage is write-once (no code path rewrites it).
        Component[] storage stored = _composition[tokenId];
        for (uint256 i; i < n; ++i) {
            stored.push(comps[i]);
        }
        _compositionHash[tokenId] = compositionHash;
        _segment[tokenId] = segment;
        _collectionId[tokenId] = params.collectionId;
        _setTokenURI(tokenId, params.staticMetadataURI);

        emit NFFCMinted(tokenId, params.collectionId, msg.sender, compositionHash, uint16(n)); // I8
        emit NFFCCompositionRecorded(tokenId, comps); // I8

        // interactions last (CEI) — may invoke `onERC721Received` on the recipient.
        _safeMint(msg.sender, tokenId);
    }

    // ------------------------------------------------------------------ views ---

    /// @inheritdoc INFFC
    function getComposition(uint256 tokenId) external view override returns (Component[] memory) {
        _requireOwned(tokenId);
        return _composition[tokenId];
    }

    /// @inheritdoc INFFC
    function getCompositionHash(uint256 tokenId) external view override returns (bytes32) {
        _requireOwned(tokenId);
        return _compositionHash[tokenId];
    }

    /// @inheritdoc INFFC
    function getSegment(uint256 tokenId) external view override returns (uint8) {
        _requireOwned(tokenId);
        return _segment[tokenId];
    }

    /// @inheritdoc INFFC
    /// @dev Structural birth rarity (TASK-14) — a pure function of the immutable
    ///      weights via {StaticRarityLib.score}, in `[0, 1e18]`. No storage, no
    ///      oracle; stable for the life of the token because the composition is.
    function getStaticRarity(uint256 tokenId) external view override returns (uint256) {
        _requireOwned(tokenId);
        Component[] storage comps = _composition[tokenId];
        uint256 n = comps.length;
        uint16[] memory weights = new uint16[](n);
        for (uint256 i; i < n; ++i) {
            weights[i] = comps[i].weightBps;
        }
        return StaticRarityLib.score(weights);
    }

    /// @notice The collection a token was minted into. Ownership/existence of the
    ///         collection is enforced in TASK-10; here the value is only recorded.
    function getCollectionId(uint256 tokenId) external view returns (uint256) {
        _requireOwned(tokenId);
        return _collectionId[tokenId];
    }

    // --------------------------------------------------------------- pausing ---

    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    // --------------------------------------------------------------- plumbing ---

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721URIStorage, AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
