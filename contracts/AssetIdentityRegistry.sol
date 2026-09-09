// SPDX-License-Identifier: MIT
pragma solidity 0.8.34;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {IAssetIdentityRegistry} from "./interfaces/IAssetIdentityRegistry.sol";

/**
 * On-chain allowlist of asset identities. Only `REGISTRY_ADMIN_ROLE` may add or
 * deactivate; `DEFAULT_ADMIN_ROLE` (the protocol multisig) grants roles.
 *
 * `assetId` is deterministic — `keccak256(abi.encode(assetClass, symbol))` — so a
 * given symbol within a class can be registered exactly once.
 */
contract AssetIdentityRegistry is IAssetIdentityRegistry, AccessControl {
    bytes32 public constant REGISTRY_ADMIN_ROLE = keccak256("REGISTRY_ADMIN_ROLE");

    mapping(bytes32 assetId => AssetIdentity) private _assets;
    mapping(bytes32 assetId => bool) private _present;

    constructor(address admin) {
        if (admin == address(0)) revert ZeroAddress();
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(REGISTRY_ADMIN_ROLE, admin);
    }

    function computeAssetId(string calldata symbol, bytes32 assetClass) public pure override returns (bytes32) {
        return keccak256(abi.encode(assetClass, symbol));
    }

    function registerAssetIdentity(string calldata symbol, string calldata name, bytes32 assetClass)
        external
        override
        onlyRole(REGISTRY_ADMIN_ROLE)
        returns (bytes32 assetId)
    {
        if (bytes(symbol).length == 0) revert EmptySymbol();
        if (assetClass == bytes32(0)) revert EmptyAssetClass();

        assetId = keccak256(abi.encode(assetClass, symbol));
        if (_present[assetId]) revert AssetAlreadyExists(assetId);

        _present[assetId] = true;
        _assets[assetId] = AssetIdentity({
            assetId: assetId,
            symbol: symbol,
            name: name,
            assetClass: assetClass,
            status: AssetStatus.ACTIVE
        });

        emit AssetIdentityRegistered(assetId, symbol, assetClass);
    }

    function setAssetStatus(bytes32 assetId, AssetStatus status) external override onlyRole(REGISTRY_ADMIN_ROLE) {
        if (!_present[assetId]) revert UnknownAsset(assetId);
        _assets[assetId].status = status;
        emit AssetIdentityStatusChanged(assetId, status);
    }

    function getAssetIdentity(bytes32 assetId) external view override returns (AssetIdentity memory) {
        if (!_present[assetId]) revert UnknownAsset(assetId);
        return _assets[assetId];
    }

    function isActiveAsset(bytes32 assetId) external view override returns (bool) {
        return _present[assetId] && _assets[assetId].status == AssetStatus.ACTIVE;
    }

    function assetExists(bytes32 assetId) external view override returns (bool) {
        return _present[assetId];
    }
}
