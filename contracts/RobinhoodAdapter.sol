// SPDX-License-Identifier: MIT
pragma solidity 0.8.34;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {IAssetIdentityRegistry} from "./interfaces/IAssetIdentityRegistry.sol";
import {IRepresentationRegistry} from "./interfaces/IRepresentationRegistry.sol";
import {IProviderAdapter} from "./interfaces/IProviderAdapter.sol";

/**
 * The single authorised on-chain entry point for syncing Robinhood Stock Token
 * representations. Fed by the off-chain sync worker (`workers/robinhood-sync/`),
 * which pulls Robinhood's official active list and reconciles it here.
 *
 * Wiring (deployment, TASK-31):
 *   - `representationRegistry.registerProvider("ROBINHOOD", address(this))`
 *   - `assetRegistry.grantRole(REGISTRY_ADMIN_ROLE, address(this))`
 *
 * Scope: this adapter can only create `EQUITY`-class asset identities and manage
 * `ROBINHOOD` representations. It never touches other providers or asset classes.
 */
contract RobinhoodAdapter is IProviderAdapter, AccessControl {
    bytes32 public constant SYNC_ROLE = keccak256("SYNC_ROLE");
    bytes32 public constant PROVIDER_ID = bytes32("ROBINHOOD");
    bytes32 public constant ASSET_CLASS = bytes32("EQUITY");
    bytes32 public constant TOKEN_STANDARD = bytes32("ERC20");

    IAssetIdentityRegistry public immutable assetRegistry;
    IRepresentationRegistry public immutable representationRegistry;
    uint256 public immutable chainId;

    struct SyncEntry {
        string symbol;
        string name;
        address token;
        uint8 decimals;
        uint256 multiplier;
        IRepresentationRegistry.OracleMetadata oracle;
    }

    event RepresentationSynced(
        bytes32 indexed representationId, address indexed token, string symbol, bool created
    );
    event RepresentationDeactivated(bytes32 indexed representationId);

    error ZeroAddress();

    constructor(
        address admin,
        address syncSigner,
        address assetRegistry_,
        address representationRegistry_,
        uint256 chainId_
    ) {
        if (
            admin == address(0) || assetRegistry_ == address(0) || representationRegistry_ == address(0)
        ) {
            revert ZeroAddress();
        }
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        if (syncSigner != address(0)) _grantRole(SYNC_ROLE, syncSigner);
        assetRegistry = IAssetIdentityRegistry(assetRegistry_);
        representationRegistry = IRepresentationRegistry(representationRegistry_);
        chainId = chainId_;
    }

    function providerId() external pure override returns (bytes32) {
        return PROVIDER_ID;
    }

    /**
     * Upsert one Robinhood Stock Token representation. Creates the `EQUITY` asset
     * identity if missing; registers the representation if missing; otherwise
     * refreshes its oracle metadata and re-activates it (handles re-listing).
     * `SYNC_ROLE` only.
     */
    function syncUpsert(SyncEntry calldata e)
        external
        onlyRole(SYNC_ROLE)
        returns (bytes32 representationId)
    {
        bytes32 assetId = assetRegistry.computeAssetId(e.symbol, ASSET_CLASS);
        if (!assetRegistry.assetExists(assetId)) {
            assetRegistry.registerAssetIdentity(e.symbol, e.name, ASSET_CLASS);
        }

        representationId = representationRegistry.computeRepresentationId(PROVIDER_ID, chainId, e.token);
        bool created = !representationRegistry.representationExists(representationId);

        if (created) {
            representationRegistry.registerRepresentation(
                IRepresentationRegistry.RegisterParams({
                    assetId: assetId,
                    providerId: PROVIDER_ID,
                    chainId: chainId,
                    token: e.token,
                    tokenStandard: TOKEN_STANDARD,
                    decimals: e.decimals,
                    multiplier: e.multiplier,
                    oracle: e.oracle
                })
            );
        } else {
            representationRegistry.updateOracleMetadata(representationId, e.oracle);
            representationRegistry.setRepresentationStatus(
                representationId, IRepresentationRegistry.RepStatus.ACTIVE
            );
        }

        emit RepresentationSynced(representationId, e.token, e.symbol, created);
    }

    function syncDeactivate(bytes32 representationId) external override onlyRole(SYNC_ROLE) {
        representationRegistry.deactivateRepresentation(representationId);
        emit RepresentationDeactivated(representationId);
    }

    /// @notice Deactivate by token address (the worker knows tokens, not ids).
    function syncDeactivateByToken(address token) external onlyRole(SYNC_ROLE) {
        bytes32 representationId =
            representationRegistry.computeRepresentationId(PROVIDER_ID, chainId, token);
        representationRegistry.deactivateRepresentation(representationId);
        emit RepresentationDeactivated(representationId);
    }
}
