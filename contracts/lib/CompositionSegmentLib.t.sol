// SPDX-License-Identifier: MIT
pragma solidity 0.8.34;

import {Test} from "forge-std/Test.sol";
import {CompositionSegmentLib} from "./CompositionSegmentLib.sol";

contract CompositionSegmentLibTest is Test {
    using CompositionSegmentLib for bool[];

    function _flags(bool a) internal pure returns (bool[] memory f) {
        f = new bool[](1);
        f[0] = a;
    }

    function _flags(bool a, bool b) internal pure returns (bool[] memory f) {
        f = new bool[](2);
        f[0] = a;
        f[1] = b;
    }

    function _flags(bool a, bool b, bool c) internal pure returns (bool[] memory f) {
        f = new bool[](3);
        f[0] = a;
        f[1] = b;
        f[2] = c;
    }

    function test_allCrypto_isCryptoOnly() public pure {
        assertEq(uint8(_flags(true).deriveSegment()), uint8(CompositionSegmentLib.Segment.CRYPTO_ONLY));
        assertEq(
            uint8(_flags(true, true, true).deriveSegment()),
            uint8(CompositionSegmentLib.Segment.CRYPTO_ONLY)
        );
    }

    function test_allStock_isStockOnly() public pure {
        assertEq(uint8(_flags(false).deriveSegment()), uint8(CompositionSegmentLib.Segment.STOCK_ONLY));
        assertEq(
            uint8(_flags(false, false).deriveSegment()), uint8(CompositionSegmentLib.Segment.STOCK_ONLY)
        );
    }

    function test_mix_isMixed() public pure {
        assertEq(uint8(_flags(true, false).deriveSegment()), uint8(CompositionSegmentLib.Segment.MIXED));
        assertEq(
            uint8(_flags(false, true, false).deriveSegment()), uint8(CompositionSegmentLib.Segment.MIXED)
        );
    }

    function test_empty_reverts() public {
        bool[] memory empty = new bool[](0);
        vm.expectRevert(CompositionSegmentLib.EmptyComposition.selector);
        this.callDerive(empty);
    }

    /// external wrapper so `vm.expectRevert` catches the revert from a call frame
    function callDerive(bool[] memory f) external pure returns (uint8) {
        return uint8(CompositionSegmentLib.deriveSegment(f));
    }

    function test_enumOrderingMatchesInffc() public pure {
        assertEq(uint8(CompositionSegmentLib.Segment.CRYPTO_ONLY), 0);
        assertEq(uint8(CompositionSegmentLib.Segment.STOCK_ONLY), 1);
        assertEq(uint8(CompositionSegmentLib.Segment.MIXED), 2);
    }

    function testFuzz_matchesReference(bool[] calldata flags) public {
        vm.assume(flags.length > 0 && flags.length <= 20);
        bool anyCrypto;
        bool anyStock;
        for (uint256 i; i < flags.length; ++i) {
            if (flags[i]) anyCrypto = true;
            else anyStock = true;
        }
        CompositionSegmentLib.Segment expected = (anyCrypto && anyStock)
            ? CompositionSegmentLib.Segment.MIXED
            : (anyCrypto ? CompositionSegmentLib.Segment.CRYPTO_ONLY : CompositionSegmentLib.Segment.STOCK_ONLY);

        bool[] memory mem = new bool[](flags.length);
        for (uint256 i; i < flags.length; ++i) {
            mem[i] = flags[i];
        }
        assertEq(uint8(CompositionSegmentLib.deriveSegment(mem)), uint8(expected));
    }
}
