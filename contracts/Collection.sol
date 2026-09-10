// SPDX-License-Identifier: MIT
pragma solidity 0.8.34;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

import {ICollection} from "./interfaces/ICollection.sol";
import {IFeeConfig} from "./interfaces/IFeeConfig.sol";

/**
 * Collection — a creator-owned grouping of NFFCs (TASK-10).
 *
 * {createCollection} charges the current on-chain creation fee, read from
 * `IFeeConfig` and scaled by the intended composition complexity. The fee is
 * forwarded to `IFeeConfig.feeRecipient()` in the same call (checks-effects-
 * interactions; `nonReentrant`); the contract holds no balance. Changing the fee
 * is an admin transaction on `IFeeConfig` — no redeploy here or of `NFFC.sol`.
 *
 * On-chain state is deliberately small: the creator (ownership) and the metadata
 * URI. The human-readable name lives in the `CollectionCreated` event for the
 * indexer.
 */
contract Collection is ICollection, AccessControl, Pausable, ReentrancyGuard {
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

    IFeeConfig public immutable feeConfig;

    uint256 private _nextCollectionId = 1;

    mapping(uint256 collectionId => address) private _owner; // address(0) => does not exist
    mapping(uint256 collectionId => string) private _metadataURI;

    constructor(address admin, address feeConfig_) {
        if (admin == address(0) || feeConfig_ == address(0)) revert ZeroAddress();
        feeConfig = IFeeConfig(feeConfig_);
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(PAUSER_ROLE, admin);
    }

    // ---------------------------------------------------------------- create ---

    /// @inheritdoc ICollection
    function createCollection(CreateParams calldata params)
        external
        payable
        override
        nonReentrant
        whenNotPaused
        returns (uint256 collectionId)
    {
        uint256 required = feeConfig.collectionCreationFee(params.expectedComponentCount);
        if (msg.value != required) revert CollectionCreationFeeNotMet(msg.value, required);

        collectionId = _nextCollectionId++;
        _owner[collectionId] = msg.sender;
        _metadataURI[collectionId] = params.metadataURI;

        emit CollectionCreated(collectionId, msg.sender, params.name);
        if (bytes(params.metadataURI).length != 0) {
            emit CollectionMetadataUpdated(collectionId, params.metadataURI);
        }

        // interaction last — forward the fee to the treasury; nothing accrues here.
        if (required != 0) {
            (bool ok,) = feeConfig.feeRecipient().call{value: required}("");
            if (!ok) revert FeeTransferFailed();
        }
    }

    // -------------------------------------------------------------- metadata ---

    /// @inheritdoc ICollection
    function setCollectionMetadata(uint256 collectionId, string calldata metadataURI) external override {
        if (_owner[collectionId] == address(0)) revert UnknownCollection(collectionId);
        if (_owner[collectionId] != msg.sender) revert NotCollectionOwner(collectionId, msg.sender);
        _metadataURI[collectionId] = metadataURI;
        emit CollectionMetadataUpdated(collectionId, metadataURI);
    }

    // ----------------------------------------------------------------- views ---

    /// @inheritdoc ICollection
    function quoteCollectionCreationFee(uint16 componentCount) external view override returns (uint256) {
        return feeConfig.collectionCreationFee(componentCount);
    }

    /// @inheritdoc ICollection
    function ownerOfCollection(uint256 collectionId) external view override returns (address) {
        address o = _owner[collectionId];
        if (o == address(0)) revert UnknownCollection(collectionId);
        return o;
    }

    function collectionMetadataURI(uint256 collectionId) external view returns (string memory) {
        if (_owner[collectionId] == address(0)) revert UnknownCollection(collectionId);
        return _metadataURI[collectionId];
    }

    function collectionExists(uint256 collectionId) external view returns (bool) {
        return _owner[collectionId] != address(0);
    }

    // --------------------------------------------------------------- pausing ---

    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }
}
