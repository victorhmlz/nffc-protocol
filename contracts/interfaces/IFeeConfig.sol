// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * On-chain fee configuration — the single source of truth for every protocol fee
 * (docs/spec/06-fee-model.md, docs/spec/04-contract-interfaces.md §7).
 *
 * `Collection.sol` (TASK-10) reads {collectionCreationFee} and {feeRecipient};
 * `NFFC.sol` will read {mintFee}; `Marketplace.sol` will read
 * {marketplaceFeeBps} / {royaltyBps}. The frontend reads these too, and never
 * hardcodes an amount. The concrete `FeeConfig.sol` — including the encoding of
 * the fee curves in the `params` blobs and the on-chain hard caps — is TASK-30.
 *
 * Every getter returns the current on-chain configuration. Every setter is
 * `FEE_ADMIN_ROLE` (a multisig) only and emits an event so the indexer can keep
 * fee-parameter history.
 */
interface IFeeConfig {
    /// Non-decreasing in `componentCount` (1..20); bounded by an on-chain hard cap.
    function collectionCreationFee(uint16 componentCount) external view returns (uint256);
    /// Non-decreasing in `componentCount` (1..20); bounded by an on-chain hard cap.
    function mintFee(uint16 componentCount) external view returns (uint256);
    /// Protocol-wide marketplace fee in basis points; bounded by an on-chain hard cap.
    function marketplaceFeeBps() external view returns (uint16);
    /// Per-collection creator royalty in basis points; bounded, and not assumed
    /// honored by external venues.
    function royaltyBps(uint256 collectionId) external view returns (uint16);
    /// Where collected fees are sent (expected: a protocol treasury multisig).
    function feeRecipient() external view returns (address);

    event CollectionFeeParamsChanged(bytes params);
    event MintFeeParamsChanged(bytes params);
    event MarketplaceFeeChanged(uint16 bps);
    event RoyaltyChanged(uint256 indexed collectionId, uint16 bps);
    event FeeRecipientChanged(address recipient);

    error FeeOutOfBounds();
    error NotFeeAdmin();

    // FEE_ADMIN_ROLE (multisig) only:
    function setCollectionFeeParams(bytes calldata params) external;
    function setMintFeeParams(bytes calldata params) external;
    function setMarketplaceFeeBps(uint16 bps) external;
    function setRoyaltyBps(uint256 collectionId, uint16 bps) external;
    function setFeeRecipient(address recipient) external;
}
