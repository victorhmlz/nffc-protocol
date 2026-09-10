// SPDX-License-Identifier: MIT
pragma solidity 0.8.34;

import {IFeeConfig} from "../interfaces/IFeeConfig.sol";

/**
 * Test double for `IFeeConfig`. The creation/mint fee is an affine, non-decreasing
 * curve `base + slope * (n - 1)` for `n >= 1` (n = 0 reverts, as a real config
 * would reject an out-of-range count). Everything is openly settable — no roles.
 */
contract MockFeeConfig is IFeeConfig {
    uint256 public base;
    uint256 public slope;
    uint16 public marketplaceBps;
    address public recipient;

    mapping(uint256 collectionId => uint16) public royalty;

    constructor(uint256 base_, uint256 slope_, address recipient_) {
        base = base_;
        slope = slope_;
        recipient = recipient_;
    }

    function setCurve(uint256 base_, uint256 slope_) external {
        base = base_;
        slope = slope_;
    }

    function _curve(uint16 n) internal view returns (uint256) {
        require(n >= 1, "MockFeeConfig: n == 0");
        return base + slope * (uint256(n) - 1);
    }

    function collectionCreationFee(uint16 componentCount) external view returns (uint256) {
        return _curve(componentCount);
    }

    function mintFee(uint16 componentCount) external view returns (uint256) {
        return _curve(componentCount);
    }

    function marketplaceFeeBps() external view returns (uint16) {
        return marketplaceBps;
    }

    function royaltyBps(uint256 collectionId) external view returns (uint16) {
        return royalty[collectionId];
    }

    function feeRecipient() external view returns (address) {
        return recipient;
    }

    function setCollectionFeeParams(bytes calldata params) external {
        emit CollectionFeeParamsChanged(params);
    }

    function setMintFeeParams(bytes calldata params) external {
        emit MintFeeParamsChanged(params);
    }

    function setMarketplaceFeeBps(uint16 bps) external {
        marketplaceBps = bps;
        emit MarketplaceFeeChanged(bps);
    }

    function setRoyaltyBps(uint256 collectionId, uint16 bps) external {
        royalty[collectionId] = bps;
        emit RoyaltyChanged(collectionId, bps);
    }

    function setFeeRecipient(address recipient_) external {
        recipient = recipient_;
        emit FeeRecipientChanged(recipient_);
    }
}
