// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * Collection — a creator-owned grouping of NFFCs
 * (docs/spec/02-domain-model.md §2.6, docs/spec/04-contract-interfaces.md §5).
 *
 * The creation fee is read from `IFeeConfig` at call time and scales with the
 * intended composition complexity; changing it is an admin transaction on
 * `IFeeConfig`, with no redeploy of this contract or of `NFFC.sol`
 * (`NFFC_Development_Plan.md` v3.2 TASK-10 acceptance).
 */
interface ICollection {
    struct CreateParams {
        string name;
        string metadataURI;
        uint16 expectedComponentCount; // fee quoting only — never a cap on what can be minted
    }

    event CollectionCreated(uint256 indexed collectionId, address indexed creator, string name);
    event CollectionMetadataUpdated(uint256 indexed collectionId, string metadataURI);

    error ZeroAddress();
    error NotCollectionOwner(uint256 collectionId, address caller);
    error CollectionCreationFeeNotMet(uint256 provided, uint256 required);
    error UnknownCollection(uint256 collectionId);
    error FeeTransferFailed();

    function createCollection(CreateParams calldata params) external payable returns (uint256 collectionId);

    function quoteCollectionCreationFee(uint16 componentCount) external view returns (uint256);
    function ownerOfCollection(uint256 collectionId) external view returns (address);
    function setCollectionMetadata(uint256 collectionId, string calldata metadataURI) external; // owner only
    /// Added TASK-30 (additive) — `FeeConfig.sol` checks this before accepting a
    /// nonzero royalty for a `collectionId`, so `royaltyBps` can never be set for
    /// a collection that doesn't exist (closes `docs/OPEN_ISSUES.md` former Issue #3's
    /// underlying risk: `Marketplace._settle` reverting on `UnknownCollection` for a
    /// bogus `collectionId` that somehow acquired a nonzero royalty).
    function collectionExists(uint256 collectionId) external view returns (bool);
}
