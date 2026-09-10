// SPDX-License-Identifier: MIT
pragma solidity 0.8.34;

import {Test} from "forge-std/Test.sol";
import {IAccessControl} from "@openzeppelin/contracts/access/IAccessControl.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";

import {Collection} from "./Collection.sol";
import {ICollection} from "./interfaces/ICollection.sol";
import {MockFeeConfig} from "./mocks/MockFeeConfig.sol";
import {RejectEther, ReenterOnReceive} from "./mocks/FeeRecipients.sol";

contract CollectionTest is Test {
    event CollectionCreated(uint256 indexed collectionId, address indexed creator, string name);
    event CollectionMetadataUpdated(uint256 indexed collectionId, string metadataURI);

    Collection internal coll;
    MockFeeConfig internal fees;

    address internal admin = makeAddr("admin");
    address internal alice = makeAddr("alice");
    address internal bob = makeAddr("bob");
    address internal treasury = makeAddr("treasury");

    uint256 internal constant BASE = 0.01 ether;
    uint256 internal constant SLOPE = 0.005 ether;

    function setUp() public {
        fees = new MockFeeConfig(BASE, SLOPE, treasury);
        coll = new Collection(admin, address(fees));
    }

    function _params(uint16 n) internal pure returns (ICollection.CreateParams memory) {
        return ICollection.CreateParams({name: "My Collection", metadataURI: "ipfs://c", expectedComponentCount: n});
    }

    function _create(address who, uint16 n) internal returns (uint256 id) {
        uint256 fee = coll.quoteCollectionCreationFee(n);
        vm.deal(who, fee);
        vm.prank(who);
        id = coll.createCollection{value: fee}(_params(n));
    }

    // ---------------------------------------------------------- happy path ---

    function test_create_happyPath() public {
        uint16 n = 3;
        uint256 fee = coll.quoteCollectionCreationFee(n);
        assertEq(fee, BASE + SLOPE * 2);
        vm.deal(alice, fee);

        vm.expectEmit(true, true, false, true, address(coll));
        emit CollectionCreated(1, alice, "My Collection");
        vm.expectEmit(true, false, false, true, address(coll));
        emit CollectionMetadataUpdated(1, "ipfs://c");

        vm.prank(alice);
        uint256 id = coll.createCollection{value: fee}(_params(n));

        assertEq(id, 1);
        assertEq(coll.ownerOfCollection(1), alice);
        assertEq(coll.collectionMetadataURI(1), "ipfs://c");
        assertTrue(coll.collectionExists(1));
        assertEq(treasury.balance, fee);
        assertEq(alice.balance, 0);
        assertEq(address(coll).balance, 0);
    }

    function test_create_incrementsId() public {
        uint256 a = _create(alice, 1);
        uint256 b = _create(bob, 5);
        assertEq(a, 1);
        assertEq(b, 2);
        assertEq(coll.ownerOfCollection(1), alice);
        assertEq(coll.ownerOfCollection(2), bob);
    }

    function test_create_zeroFee_ok() public {
        fees.setCurve(0, 0);
        vm.prank(alice);
        uint256 id = coll.createCollection{value: 0}(_params(4));
        assertEq(id, 1);
        assertEq(coll.ownerOfCollection(1), alice);
        assertEq(treasury.balance, 0);
    }

    function test_create_emptyMetadata_ok() public {
        uint256 fee = coll.quoteCollectionCreationFee(1);
        vm.deal(alice, fee);
        vm.prank(alice);
        coll.createCollection{value: fee}(
            ICollection.CreateParams({name: "n", metadataURI: "", expectedComponentCount: 1})
        );
        assertEq(coll.collectionMetadataURI(1), "");
    }

    // -------------------------------------------------------------- fee gate ---

    function test_create_underpay_reverts() public {
        uint256 fee = coll.quoteCollectionCreationFee(2);
        vm.deal(alice, fee);
        vm.prank(alice);
        vm.expectRevert(
            abi.encodeWithSelector(ICollection.CollectionCreationFeeNotMet.selector, fee - 1, fee)
        );
        coll.createCollection{value: fee - 1}(_params(2));
    }

    function test_create_overpay_reverts() public {
        uint256 fee = coll.quoteCollectionCreationFee(2);
        vm.deal(alice, fee + 1);
        vm.prank(alice);
        vm.expectRevert(
            abi.encodeWithSelector(ICollection.CollectionCreationFeeNotMet.selector, fee + 1, fee)
        );
        coll.createCollection{value: fee + 1}(_params(2));
    }

    function test_create_feeTransferFails_reverts() public {
        RejectEther sink = new RejectEther();
        fees.setFeeRecipient(address(sink));

        uint256 fee = coll.quoteCollectionCreationFee(3);
        vm.deal(alice, fee);
        vm.prank(alice);
        vm.expectRevert(ICollection.FeeTransferFailed.selector);
        coll.createCollection{value: fee}(_params(3));
    }

    function test_create_reentrancy_blocked() public {
        ReenterOnReceive attacker = new ReenterOnReceive(address(coll));
        fees.setFeeRecipient(address(attacker));
        attacker.arm();

        uint256 fee = coll.quoteCollectionCreationFee(1);
        vm.deal(alice, fee);
        vm.prank(alice);
        // outer forward hits the attacker's receive(), which re-enters and trips
        // nonReentrant; the failed inner call surfaces as FeeTransferFailed.
        vm.expectRevert(ICollection.FeeTransferFailed.selector);
        coll.createCollection{value: fee}(_params(1));
    }

    // -------------------------------------------------------------- quoting ---

    function test_quote_matchesConfig_andMonotonic() public view {
        assertEq(coll.quoteCollectionCreationFee(1), BASE);
        assertEq(coll.quoteCollectionCreationFee(20), BASE + SLOPE * 19);
        uint256 prev;
        for (uint16 n = 1; n <= 20; ++n) {
            uint256 q = coll.quoteCollectionCreationFee(n);
            assertGe(q, prev);
            prev = q;
        }
    }

    function test_quote_reflectsConfigChange_noRedeploy() public {
        uint256 before = coll.quoteCollectionCreationFee(5);
        fees.setCurve(1 ether, 0);
        assertEq(coll.quoteCollectionCreationFee(5), 1 ether);
        assertTrue(coll.quoteCollectionCreationFee(5) != before);
    }

    // ------------------------------------------------------------- metadata ---

    function test_setMetadata_ownerOnly() public {
        _create(alice, 2);

        vm.expectEmit(true, false, false, true, address(coll));
        emit CollectionMetadataUpdated(1, "ipfs://new");
        vm.prank(alice);
        coll.setCollectionMetadata(1, "ipfs://new");
        assertEq(coll.collectionMetadataURI(1), "ipfs://new");
    }

    function test_setMetadata_notOwner_reverts() public {
        _create(alice, 2);
        vm.prank(bob);
        vm.expectRevert(abi.encodeWithSelector(ICollection.NotCollectionOwner.selector, 1, bob));
        coll.setCollectionMetadata(1, "ipfs://x");
    }

    function test_setMetadata_unknownCollection_reverts() public {
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(ICollection.UnknownCollection.selector, 99));
        coll.setCollectionMetadata(99, "ipfs://x");
    }

    // ---------------------------------------------------------------- views ---

    function test_ownerOfCollection_unknown_reverts() public {
        vm.expectRevert(abi.encodeWithSelector(ICollection.UnknownCollection.selector, 1));
        coll.ownerOfCollection(1);
    }

    function test_collectionMetadataURI_unknown_reverts() public {
        vm.expectRevert(abi.encodeWithSelector(ICollection.UnknownCollection.selector, 1));
        coll.collectionMetadataURI(1);
    }

    function test_collectionExists() public {
        assertFalse(coll.collectionExists(1));
        _create(alice, 1);
        assertTrue(coll.collectionExists(1));
    }

    // --------------------------------------------------------------- pausing ---

    function test_pause_blocksCreate() public {
        vm.prank(admin);
        coll.pause();

        uint256 fee = coll.quoteCollectionCreationFee(1);
        vm.deal(alice, fee);
        vm.prank(alice);
        vm.expectRevert(Pausable.EnforcedPause.selector);
        coll.createCollection{value: fee}(_params(1));
    }

    function test_unpause_restoresCreate() public {
        vm.startPrank(admin);
        coll.pause();
        coll.unpause();
        vm.stopPrank();

        uint256 id = _create(alice, 1);
        assertEq(coll.ownerOfCollection(id), alice);
    }

    function test_pause_onlyPauser() public {
        bytes32 role = coll.PAUSER_ROLE();
        vm.prank(bob);
        vm.expectRevert(abi.encodeWithSelector(IAccessControl.AccessControlUnauthorizedAccount.selector, bob, role));
        coll.pause();
    }

    // ----------------------------------------------------------- construction ---

    function test_constructor_rejectsZeroAdmin() public {
        vm.expectRevert(ICollection.ZeroAddress.selector);
        new Collection(address(0), address(fees));
    }

    function test_constructor_rejectsZeroFeeConfig() public {
        vm.expectRevert(ICollection.ZeroAddress.selector);
        new Collection(admin, address(0));
    }

    // ------------------------------------------------------------------ fuzz ---

    function testFuzz_create_paysExactFee(uint16 n, uint96 curveBase, uint96 curveSlope) public {
        n = uint16(bound(n, 1, 20));
        fees.setCurve(curveBase, curveSlope);

        uint256 fee = coll.quoteCollectionCreationFee(n);
        vm.deal(alice, fee);
        vm.prank(alice);
        uint256 id = coll.createCollection{value: fee}(_params(n));

        assertEq(coll.ownerOfCollection(id), alice);
        assertEq(treasury.balance, fee);
        assertEq(address(coll).balance, 0);
    }
}
