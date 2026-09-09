// SPDX-License-Identifier: MIT
pragma solidity 0.8.34;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {IERC20Metadata} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import {IAssetIdentityRegistry} from "./interfaces/IAssetIdentityRegistry.sol";
import {IRepresentationRegistry} from "./interfaces/IRepresentationRegistry.sol";

/**
 * On-chain allowlist of asset representations. A representation is admitted only
 * through {registerRepresentation}, which is callable by `REGISTRY_ADMIN_ROLE` or
 * the calling provider's registered adapter — never by an arbitrary account — and
 * only after the token address is verified (is a contract, exposes `decimals()`
 * matching the declared value) and the asset identity is active.
 *
 * The contract makes no single-provider assumption: `providerId` is a parameter,
 * and a second provider is onboarded with {registerProvider} + an adapter, with
 * no code change (TASK-05 acceptance).
 *
 * Immutable-by-construction: once registered, only `oracle` and `status` of a
 * representation can change. There is no setter for `assetId`, `token`,
 * `decimals`, `multiplier`, `chainId`, or `providerId`.
 */
contract RepresentationRegistry is IRepresentationRegistry, AccessControl {
    bytes32 public constant REGISTRY_ADMIN_ROLE = keccak256("REGISTRY_ADMIN_ROLE");

    IAssetIdentityRegistry public immutable assetRegistry;

    mapping(bytes32 providerId => Provider) private _providers;
    mapping(bytes32 representationId => Representation) private _reps;
    mapping(bytes32 representationId => bool) private _repPresent;
    mapping(bytes32 assetId => bytes32[] representationIds) private _repsByAsset;

    constructor(address admin, address assetRegistry_) {
        if (admin == address(0) || assetRegistry_ == address(0)) revert ZeroAddress();
        assetRegistry = IAssetIdentityRegistry(assetRegistry_);
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(REGISTRY_ADMIN_ROLE, admin);
    }

    function computeRepresentationId(bytes32 providerId, uint256 chainId, address token)
        public
        pure
        override
        returns (bytes32)
    {
        return keccak256(abi.encode(providerId, chainId, token));
    }

    // ---------------------------------------------------------------- providers

    function registerProvider(bytes32 providerId, address adapter)
        external
        override
        onlyRole(REGISTRY_ADMIN_ROLE)
    {
        if (providerId == bytes32(0)) revert EmptyProviderId();
        if (_providers[providerId].exists) revert ProviderAlreadyExists(providerId);
        _providers[providerId] = Provider({exists: true, active: true, adapter: adapter});
        emit ProviderRegistered(providerId, adapter);
    }

    function setProviderAdapter(bytes32 providerId, address adapter)
        external
        override
        onlyRole(REGISTRY_ADMIN_ROLE)
    {
        if (!_providers[providerId].exists) revert UnknownProvider(providerId);
        _providers[providerId].adapter = adapter;
        emit ProviderAdapterChanged(providerId, adapter);
    }

    function setProviderActive(bytes32 providerId, bool active)
        external
        override
        onlyRole(REGISTRY_ADMIN_ROLE)
    {
        if (!_providers[providerId].exists) revert UnknownProvider(providerId);
        _providers[providerId].active = active;
        emit ProviderActiveChanged(providerId, active);
    }

    function getProvider(bytes32 providerId) external view override returns (Provider memory) {
        return _providers[providerId];
    }

    // ----------------------------------------------------------- representations

    function registerRepresentation(RegisterParams calldata p)
        external
        override
        returns (bytes32 representationId)
    {
        Provider memory prov = _providers[p.providerId];
        if (!prov.exists) revert UnknownProvider(p.providerId);
        if (!prov.active) revert ProviderInactive(p.providerId);
        _requireProviderAuth(p.providerId, prov);

        if (!assetRegistry.isActiveAsset(p.assetId)) revert AssetNotActive(p.assetId);
        if (p.token == address(0)) revert ZeroAddress();
        if (p.token.code.length == 0) revert TokenNotAContract(p.token);
        if (p.chainId == 0) revert ZeroChainId();
        if (p.multiplier == 0) revert ZeroMultiplier();
        if (p.tokenStandard == bytes32(0)) revert EmptyTokenStandard();
        _verifyDecimals(p.token, p.decimals);

        representationId = keccak256(abi.encode(p.providerId, p.chainId, p.token));
        if (_repPresent[representationId]) revert RepresentationAlreadyExists(representationId);

        uint64 nowTs = uint64(block.timestamp);
        _repPresent[representationId] = true;
        _reps[representationId] = Representation({
            representationId: representationId,
            assetId: p.assetId,
            providerId: p.providerId,
            chainId: p.chainId,
            token: p.token,
            tokenStandard: p.tokenStandard,
            decimals: p.decimals,
            multiplier: p.multiplier,
            oracle: p.oracle,
            status: RepStatus.ACTIVE,
            createdAt: nowTs,
            updatedAt: nowTs
        });
        _repsByAsset[p.assetId].push(representationId);

        emit RepresentationRegistered(representationId, p.assetId, p.providerId, p.token, p.chainId);
    }

    function setRepresentationStatus(bytes32 representationId, RepStatus status) external override {
        Representation storage r = _requireRep(representationId);
        _requireProviderAuth(r.providerId, _providers[r.providerId]);
        r.status = status;
        r.updatedAt = uint64(block.timestamp);
        emit RepresentationStatusChanged(representationId, status);
    }

    /// @notice Convenience for adapters when a provider delists an asset.
    function deactivateRepresentation(bytes32 representationId) external override {
        Representation storage r = _requireRep(representationId);
        _requireProviderAuth(r.providerId, _providers[r.providerId]);
        r.status = RepStatus.INACTIVE;
        r.updatedAt = uint64(block.timestamp);
        emit RepresentationStatusChanged(representationId, RepStatus.INACTIVE);
    }

    function updateOracleMetadata(bytes32 representationId, OracleMetadata calldata oracle) external override {
        Representation storage r = _requireRep(representationId);
        _requireProviderAuth(r.providerId, _providers[r.providerId]);
        r.oracle = oracle;
        r.updatedAt = uint64(block.timestamp);
        emit RepresentationOracleUpdated(representationId, oracle);
    }

    // --------------------------------------------------------------------- views

    function getRepresentation(bytes32 representationId)
        external
        view
        override
        returns (Representation memory)
    {
        if (!_repPresent[representationId]) revert UnknownRepresentation(representationId);
        return _reps[representationId];
    }

    function isActiveRepresentation(bytes32 representationId) external view override returns (bool) {
        return _repPresent[representationId] && _reps[representationId].status == RepStatus.ACTIVE;
    }

    function representationExists(bytes32 representationId) external view override returns (bool) {
        return _repPresent[representationId];
    }

    function resolvesTo(bytes32 representationId, bytes32 assetId) external view override returns (bool) {
        return _repPresent[representationId] && _reps[representationId].assetId == assetId;
    }

    function getRepresentationsByAsset(bytes32 assetId) external view override returns (bytes32[] memory) {
        return _repsByAsset[assetId];
    }

    // ----------------------------------------------------------------- internal

    function _requireRep(bytes32 representationId) private view returns (Representation storage r) {
        if (!_repPresent[representationId]) revert UnknownRepresentation(representationId);
        r = _reps[representationId];
    }

    function _requireProviderAuth(bytes32 providerId, Provider memory prov) private view {
        if (hasRole(REGISTRY_ADMIN_ROLE, msg.sender)) return;
        if (prov.adapter != address(0) && msg.sender == prov.adapter) return;
        revert NotProviderAuthorized(providerId, msg.sender);
    }

    function _verifyDecimals(address token, uint8 expected) private view {
        try IERC20Metadata(token).decimals() returns (uint8 actual) {
            if (actual != expected) revert DecimalsMismatch(token, expected, actual);
        } catch {
            revert TokenMetadataUnavailable(token);
        }
    }
}
