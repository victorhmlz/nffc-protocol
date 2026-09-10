// SPDX-License-Identifier: MIT
pragma solidity 0.8.34;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {IAssetIdentityRegistry} from "./interfaces/IAssetIdentityRegistry.sol";
import {IRepresentationRegistry} from "./interfaces/IRepresentationRegistry.sol";
import {IProviderAdapter} from "./interfaces/IProviderAdapter.sol";

/**
 * Shared implementation for every provider adapter. A concrete adapter only
 * supplies its identity constants — {_providerId}, {_assetClass},
 * {_tokenStandard} — so Robinhood and native crypto run **identical** sync logic
 * (`docs/spec/05-adapter-architecture.md`: peers, same interface, no hierarchy).
 *
 * Wiring per adapter (deployment, TASK-31):
 *   - `representationRegistry.registerProvider(providerId(), address(adapter))`
 *   - `assetRegistry.grantRole(REGISTRY_ADMIN_ROLE, address(adapter))`
 */
abstract contract ProviderAdapterBase is IProviderAdapter, AccessControl {
    bytes32 public constant SYNC_ROLE = keccak256("SYNC_ROLE");

    IAssetIdentityRegistry public immutable assetRegistry;
    IRepresentationRegistry public immutable representationRegistry;
    uint256 public immutable chainId;

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

    function _providerId() internal pure virtual returns (bytes32);
    function _assetClass() internal pure virtual returns (bytes32);
    function _tokenStandard() internal pure virtual returns (bytes32);

    function providerId() external pure override returns (bytes32) {
        return _providerId();
    }

    function assetClass() external pure override returns (bytes32) {
        return _assetClass();
    }

    function syncUpsert(SyncEntry calldata e)
        external
        override
        onlyRole(SYNC_ROLE)
        returns (bytes32 representationId)
    {
        bytes32 pid = _providerId();
        bytes32 klass = _assetClass();

        bytes32 assetId = assetRegistry.computeAssetId(e.symbol, klass);
        if (!assetRegistry.assetExists(assetId)) {
            assetRegistry.registerAssetIdentity(e.symbol, e.name, klass);
        }

        representationId = representationRegistry.computeRepresentationId(pid, chainId, e.token);
        bool created = !representationRegistry.representationExists(representationId);

        if (created) {
            representationRegistry.registerRepresentation(
                IRepresentationRegistry.RegisterParams({
                    assetId: assetId,
                    providerId: pid,
                    chainId: chainId,
                    token: e.token,
                    tokenStandard: _tokenStandard(),
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

    function syncDeactivateByToken(address token) external override onlyRole(SYNC_ROLE) {
        bytes32 representationId =
            representationRegistry.computeRepresentationId(_providerId(), chainId, token);
        representationRegistry.deactivateRepresentation(representationId);
        emit RepresentationDeactivated(representationId);
    }
}
