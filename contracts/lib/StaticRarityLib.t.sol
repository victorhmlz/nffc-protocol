// SPDX-License-Identifier: MIT
pragma solidity 0.8.34;

import {Test} from "forge-std/Test.sol";
import {StaticRarityLib} from "./StaticRarityLib.sol";

contract StaticRarityLibTest is Test {
    uint256 internal constant WAD = 1e18;

    function _score(uint16[] memory w) internal pure returns (uint256) {
        return StaticRarityLib.score(w);
    }

    function _even(uint256 n) internal pure returns (uint16[] memory w) {
        w = new uint16[](n);
        uint16 base = uint16(10_000 / n);
        for (uint256 i; i < n; ++i) w[i] = base;
        w[0] = uint16(w[0] + (10_000 - uint256(base) * n));
    }

    function _pair(uint16 a, uint16 b) internal pure returns (uint16[] memory w) {
        w = new uint16[](2);
        w[0] = a;
        w[1] = b;
    }

    // -------------------------------------------------- exact reference vectors ---
    // Recomputed by hand and mirrored in domain/rarity/rarity.test.ts.

    function test_oneComponent_isMax() public pure {
        uint16[] memory w = new uint16[](1);
        w[0] = 10_000;
        assertEq(_score(w), WAD);
    }

    function test_twoEven() public pure {
        assertEq(_score(_pair(5000, 5000)), 378_947_368_421_052_631);
    }

    function test_twoConcentrated_9000_1000() public pure {
        assertEq(_score(_pair(9000, 1000)), 762_947_368_421_052_631);
    }

    function test_twentyEven_isZero() public pure {
        assertEq(_score(_even(20)), 0);
    }

    function test_twentyConcentrated() public pure {
        uint16[] memory w = new uint16[](20);
        w[0] = 9981;
        for (uint256 i = 1; i < 20; ++i) w[i] = 1;
        assertEq(_score(w), 597_602_400_000_000_000);
    }

    // --------------------------------------------------------------- monotonic ---

    function test_moreConcentration_isRarer() public pure {
        assertGt(_score(_pair(9000, 1000)), _score(_pair(5000, 5000)));
        assertGt(_score(_pair(9999, 1)), _score(_pair(9000, 1000)));
    }

    function test_fewerComponents_isRarer() public pure {
        assertGt(_score(_even(2)), _score(_even(5)));
        assertGt(_score(_even(5)), _score(_even(10)));
        assertGt(_score(_even(10)), _score(_even(20)));
    }

    function test_scoreNeverExceedsWad() public pure {
        assertLe(_score(_pair(9999, 1)), WAD);
        assertLe(_score(_even(2)), WAD);
        for (uint256 n = 1; n <= 20; ++n) assertLe(_score(_even(n)), WAD);
    }

    // ------------------------------------------------------------------- fuzz ---

    function testFuzz_boundedAndConcentrationMonotone(uint8 nRaw, uint16 firstShare) public pure {
        uint256 n = (uint256(nRaw) % 19) + 2; // 2..20
        firstShare = uint16(bound(firstShare, 10_000 / n, 10_000 - (n - 1)));

        // any valid weight vector: w[0] = firstShare, the rest split as evenly as possible, all > 0
        uint16[] memory w = new uint16[](n);
        w[0] = firstShare;
        uint16 rest = uint16((10_000 - firstShare) / (n - 1));
        uint256 acc = firstShare;
        for (uint256 i = 1; i < n; ++i) {
            w[i] = i == n - 1 ? uint16(10_000 - acc) : rest;
            acc += w[i];
        }

        uint256 s = _score(w);
        assertLe(s, WAD);

        // Moving 1 bps from a lightest component to a heaviest one only concentrates
        // the set, so the score must not decrease (HHI is Schur-convex).
        uint256 hi;
        uint256 lo;
        for (uint256 i; i < n; ++i) {
            if (w[i] > w[hi]) hi = i;
            if (w[i] < w[lo]) lo = i;
        }
        if (hi != lo && w[lo] > 1) {
            uint16[] memory w2 = new uint16[](n);
            for (uint256 i; i < n; ++i) w2[i] = w[i];
            w2[hi] = w2[hi] + 1;
            w2[lo] = w2[lo] - 1;
            assertGe(_score(w2), s);
        }
    }

    // ------------------------------------------------------------------ revert ---

    function test_empty_reverts() public {
        uint16[] memory w = new uint16[](0);
        vm.expectRevert(StaticRarityLib.EmptyComposition.selector);
        this.callScore(w);
    }

    function callScore(uint16[] memory w) external pure returns (uint256) {
        return StaticRarityLib.score(w);
    }
}
