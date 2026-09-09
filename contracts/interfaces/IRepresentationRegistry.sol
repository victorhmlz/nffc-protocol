// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * Representation — *a specific verified on-chain token* that stands for an Asset
 * Identity, via a Provider, on a Network. See docs/spec/02-domain-model.md §2.4
 * and docs/spec/04-contract-interfaces.md §2.
 *
 * Providers are peers (Robinhood, native crypto, …). Adding a provider is a
 * `registerProvider` call plus an off-chain adapter — no change to this contract
 * (TASK-05 acceptance).
 */
interface IRepresentationRegistry {
    enum RepStatus {
        INACTIVE,
        ACTIVE
    }

    struct OracleMetadata {
        address feed; // Chainlink aggregator on the representation's network
        uint32 heartbeat; // max acceptable staleness, seconds
        uint8 feedDecimals;
    }

    struct Provider {
        bool exists;
        bool active;
        /// Off-chain sync signer allowed to manage *this provider's*
        /// representations (in addition to `REGISTRY_ADMIN_ROLE`). address(0) = none.
        address adapter;
    }

    struct Representation {
        bytes32 representationId; // keccak256(abi.encode(providerId, chainId, token))
        bytes32 assetId;
        bytes32 providerId;
        uint256 chainId;
        address token; // verified: must be a contract exposing decimals()
        bytes32 tokenStandard; // "ERC20" in V1
        uint8 decimals;
        uint256 multiplier; // scale token unit ↔ 1 unit underlying; 1e18 == 1.0
        OracleMetadata oracle;
        RepStatus status;
        uint64 createdAt;
        uint64 updatedAt;
    }

    /// Immutable fields (assetId, providerId, chainId, token, tokenStandard,
    /// decimals, multiplier) are set once by the contract; only `oracle` and
    /// `status` can change afterwards.
    struct RegisterParams {
        bytes32 assetId;
        bytes32 providerId;
        uint256 chainId;
        address token;
        bytes32 tokenStandard;
        uint8 decimals;
        uint256 multiplier;
        OracleMetadata oracle;
    }

    event ProviderRegistered(bytes32 indexed providerId, address adapter);
    event ProviderAdapterChanged(bytes32 indexed providerId, address adapter);
    event ProviderActiveChanged(bytes32 indexed providerId, bool active);

    event RepresentationRegistered(
        bytes32 indexed representationId,
        bytes32 indexed assetId,
        bytes32 indexed providerId,
        address token,
        uint256 chainId
    );
    event RepresentationStatusChanged(bytes32 indexed representationId, RepStatus status);
    event RepresentationOracleUpdated(bytes32 indexed representationId, OracleMetadata oracle);

    error ZeroAddress();
    error EmptyProviderId();
    error ProviderAlreadyExists(bytes32 providerId);
    error UnknownProvider(bytes32 providerId);
    error ProviderInactive(bytes32 providerId);
    error NotProviderAuthorized(bytes32 providerId, address caller);
    error AssetNotActive(bytes32 assetId);
    error TokenNotAContract(address token);
    error TokenMetadataUnavailable(address token);
    error DecimalsMismatch(address token, uint8 expected, uint8 actual);
    error ZeroChainId();
    error ZeroMultiplier();
    error EmptyTokenStandard();
    error RepresentationAlreadyExists(bytes32 representationId);
    error UnknownRepresentation(bytes32 representationId);

    /// @notice The deterministic id for a (providerId, chainId, token) triple.
    function computeRepresentationId(bytes32 providerId, uint256 chainId, address token)
        external
        pure
        returns (bytes32);

    // --- provider admin (REGISTRY_ADMIN_ROLE) ---
    function registerProvider(bytes32 providerId, address adapter) external;
    function setProviderAdapter(bytes32 providerId, address adapter) external;
    function setProviderActive(bytes32 providerId, bool active) external;
    function getProvider(bytes32 providerId) external view returns (Provider memory);

    // --- representation lifecycle (REGISTRY_ADMIN_ROLE or the provider's adapter) ---
    function registerRepresentation(RegisterParams calldata params) external returns (bytes32 representationId);
    function setRepresentationStatus(bytes32 representationId, RepStatus status) external;
    function deactivateRepresentation(bytes32 representationId) external;
    function updateOracleMetadata(bytes32 representationId, OracleMetadata calldata oracle) external;

    // --- views ---
    function getRepresentation(bytes32 representationId) external view returns (Representation memory);
    function isActiveRepresentation(bytes32 representationId) external view returns (bool);
    function representationExists(bytes32 representationId) external view returns (bool);
    function resolvesTo(bytes32 representationId, bytes32 assetId) external view returns (bool);
    function getRepresentationsByAsset(bytes32 assetId) external view returns (bytes32[] memory);
}
