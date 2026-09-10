// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * Composition segmentation (TASK-08). `NFFC.sol` (TASK-09) calls
 * {deriveSegment} at mint from each component's "is this a native-crypto asset?"
 * flag (resolved from the registry) and stores the result — the minter cannot
 * pass a segment. Enum values match `INFFC.getSegment`
 * (`docs/spec/04-contract-interfaces.md` §4).
 */
library CompositionSegmentLib {
    enum Segment {
        CRYPTO_ONLY, // 0
        STOCK_ONLY, // 1
        MIXED // 2
    }

    error EmptyComposition();

    /// @param isCryptoNative one flag per component, in composition order.
    function deriveSegment(bool[] memory isCryptoNative) internal pure returns (Segment) {
        uint256 n = isCryptoNative.length;
        if (n == 0) revert EmptyComposition();

        bool anyCrypto;
        bool anyStock;
        for (uint256 i; i < n; ++i) {
            if (isCryptoNative[i]) anyCrypto = true;
            else anyStock = true;
        }

        if (anyCrypto && anyStock) return Segment.MIXED;
        return anyCrypto ? Segment.CRYPTO_ONLY : Segment.STOCK_ONLY;
    }
}
