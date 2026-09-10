// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * Asset Identity — *what economic thing* is referenced (NVDA, BTC).
 * Provider-independent, network-independent, no address of its own.
 * See docs/spec/02-domain-model.md §2.1 and docs/spec/04-contract-interfaces.md §1.
 */
interface IAssetIdentityRegistry {
    enum AssetStatus {
        INACTIVE,
        ACTIVE
    }

    struct AssetIdentity {
        bytes32 assetId; // opaque, deterministic from (assetClass, symbol); NOT an address
        string symbol;
        string name;
        bytes32 assetClass; // descriptive only ("EQUITY", "CRYPTO") — never branches privileged logic
        AssetStatus status;
    }

    event AssetIdentityRegistered(bytes32 indexed assetId, string symbol, bytes32 indexed assetClass);
    event AssetIdentityStatusChanged(bytes32 indexed assetId, AssetStatus status);

    error AssetAlreadyExists(bytes32 assetId);
    error UnknownAsset(bytes32 assetId);
    error EmptySymbol();
    error EmptyAssetClass();
    error ZeroAddress();

    /// @notice The deterministic id for a (symbol, assetClass) pair.
    function computeAssetId(string calldata symbol, bytes32 assetClass) external pure returns (bytes32);

    /// @notice Register a new asset identity. Restricted to `REGISTRY_ADMIN_ROLE`.
    /// @return assetId keccak256(abi.encode(assetClass, symbol))
    function registerAssetIdentity(string calldata symbol, string calldata name, bytes32 assetClass)
        external
        returns (bytes32 assetId);

    /// @notice Activate/deactivate an asset. Restricted to `REGISTRY_ADMIN_ROLE`.
    function setAssetStatus(bytes32 assetId, AssetStatus status) external;

    function getAssetIdentity(bytes32 assetId) external view returns (AssetIdentity memory);

    function isActiveAsset(bytes32 assetId) external view returns (bool);

    function assetExists(bytes32 assetId) external view returns (bool);
}
