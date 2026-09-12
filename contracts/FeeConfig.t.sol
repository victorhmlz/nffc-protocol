// SPDX-License-Identifier: MIT
pragma solidity 0.8.34;

import {Test} from "forge-std/Test.sol";
import {IAccessControl} from "@openzeppelin/contracts/access/IAccessControl.sol";

import {FeeConfig} from "./FeeConfig.sol";
import {IFeeConfig} from "./interfaces/IFeeConfig.sol";
import {Collection} from "./Collection.sol";
import {ICollection} from "./interfaces/ICollection.sol";

contract FeeConfigTest is Test {
    // re-declared locally so `vm.expectEmit` matches without an interface-qualified
    // event reference (same convention as NFFC.t.sol / Collection.t.sol).
    event CollectionFeeParamsChanged(bytes params);
    event MintFeeParamsChanged(bytes params);
    event MarketplaceFeeChanged(uint16 bps);
    event RoyaltyChanged(uint256 indexed collectionId, uint16 bps);
    event FeeRecipientChanged(address recipient);
    event CollectionSet(address collection);

    FeeConfig internal fees;
    Collection internal coll;

    address internal admin = makeAddr("admin");
    address internal stranger = makeAddr("stranger");
    address internal treasury = makeAddr("treasury");
    address internal treasury2 = makeAddr("treasury2");

    uint256 internal constant COLLECTION_BASE = 0.01 ether;
    uint256 internal constant COLLECTION_SLOPE = 0.005 ether;
    uint256 internal constant MINT_BASE = 0.001 ether;
    uint256 internal constant MINT_SLOPE = 0.0005 ether;
    uint16 internal constant MARKETPLACE_BPS = 150; // 1.5%, the whitepaper's non-binding target

    function setUp() public {
        vm.prank(admin);
        fees = new FeeConfig(admin, COLLECTION_BASE, COLLECTION_SLOPE, MINT_BASE, MINT_SLOPE, MARKETPLACE_BPS, treasury);
        coll = new Collection(admin, address(fees));
        vm.prank(admin);
        fees.setCollection(address(coll));
    }

    // ----------------------------------------------------------- construction ---

    function test_constructor_rejectsZeroAdmin() public {
        vm.expectRevert(FeeConfig.ZeroAddress.selector);
        new FeeConfig(address(0), COLLECTION_BASE, COLLECTION_SLOPE, MINT_BASE, MINT_SLOPE, MARKETPLACE_BPS, treasury);
    }

    function test_constructor_rejectsZeroFeeRecipient() public {
        vm.expectRevert(FeeConfig.ZeroAddress.selector);
        new FeeConfig(admin, COLLECTION_BASE, COLLECTION_SLOPE, MINT_BASE, MINT_SLOPE, MARKETPLACE_BPS, address(0));
    }

    function test_constructor_rejectsCollectionFeeCurveOverCap() public {
        uint256 cap = fees.MAX_CURVE_FEE_AT_MAX_N();
        vm.expectRevert(IFeeConfig.FeeOutOfBounds.selector);
        new FeeConfig(admin, cap + 1, 0, MINT_BASE, MINT_SLOPE, MARKETPLACE_BPS, treasury);
    }

    function test_constructor_rejectsMintFeeCurveOverCap() public {
        uint256 cap = fees.MAX_CURVE_FEE_AT_MAX_N();
        vm.expectRevert(IFeeConfig.FeeOutOfBounds.selector);
        new FeeConfig(admin, COLLECTION_BASE, COLLECTION_SLOPE, cap + 1, 0, MARKETPLACE_BPS, treasury);
    }

    function test_constructor_rejectsMarketplaceFeeOverCap() public {
        uint16 cap = fees.MAX_MARKETPLACE_FEE_BPS();
        vm.expectRevert(IFeeConfig.FeeOutOfBounds.selector);
        new FeeConfig(admin, COLLECTION_BASE, COLLECTION_SLOPE, MINT_BASE, MINT_SLOPE, cap + 1, treasury);
    }

    function test_constructor_grantsRolesToAdmin() public view {
        assertTrue(fees.hasRole(fees.DEFAULT_ADMIN_ROLE(), admin));
        assertTrue(fees.hasRole(fees.FEE_ADMIN_ROLE(), admin));
    }

    // ------------------------------------------------------------------ curves ---

    function test_collectionCreationFee_affineCurve() public view {
        assertEq(fees.collectionCreationFee(1), COLLECTION_BASE);
        assertEq(fees.collectionCreationFee(20), COLLECTION_BASE + COLLECTION_SLOPE * 19);
    }

    function test_mintFee_affineCurve() public view {
        assertEq(fees.mintFee(1), MINT_BASE);
        assertEq(fees.mintFee(20), MINT_BASE + MINT_SLOPE * 19);
    }

    function test_collectionCreationFee_zeroComponents_reverts() public {
        vm.expectRevert(abi.encodeWithSelector(FeeConfig.InvalidComponentCount.selector, 0));
        fees.collectionCreationFee(0);
    }

    function test_collectionCreationFee_tooManyComponents_reverts() public {
        vm.expectRevert(abi.encodeWithSelector(FeeConfig.InvalidComponentCount.selector, 21));
        fees.collectionCreationFee(21);
    }

    function test_mintFee_zeroComponents_reverts() public {
        vm.expectRevert(abi.encodeWithSelector(FeeConfig.InvalidComponentCount.selector, 0));
        fees.mintFee(0);
    }

    function testFuzz_curves_areMonotonic(uint16 a, uint16 b) public view {
        a = uint16(bound(a, 1, 20));
        b = uint16(bound(b, 1, 20));
        vm.assume(a <= b);
        assertGe(fees.collectionCreationFee(b), fees.collectionCreationFee(a));
        assertGe(fees.mintFee(b), fees.mintFee(a));
    }

    // --------------------------------------------------------- access control ---

    function _expectFeeAdminOnly() internal {
        vm.expectRevert(
            abi.encodeWithSelector(IAccessControl.AccessControlUnauthorizedAccount.selector, stranger, fees.FEE_ADMIN_ROLE())
        );
    }

    function test_nonAdmin_cannotSetCollectionFeeParams() public {
        _expectFeeAdminOnly();
        vm.prank(stranger);
        fees.setCollectionFeeParams(abi.encode(uint256(1 ether), uint256(0)));
    }

    function test_nonAdmin_cannotSetMintFeeParams() public {
        _expectFeeAdminOnly();
        vm.prank(stranger);
        fees.setMintFeeParams(abi.encode(uint256(1 ether), uint256(0)));
    }

    function test_nonAdmin_cannotSetMarketplaceFeeBps() public {
        _expectFeeAdminOnly();
        vm.prank(stranger);
        fees.setMarketplaceFeeBps(500);
    }

    function test_nonAdmin_cannotSetRoyaltyBps() public {
        uint256 id = _createCollection();
        _expectFeeAdminOnly();
        vm.prank(stranger);
        fees.setRoyaltyBps(id, 500);
    }

    function test_nonAdmin_cannotSetFeeRecipient() public {
        _expectFeeAdminOnly();
        vm.prank(stranger);
        fees.setFeeRecipient(treasury2);
    }

    function test_nonAdmin_cannotSetCollection() public {
        _expectFeeAdminOnly();
        vm.prank(stranger);
        fees.setCollection(address(coll));
    }

    // ------------------------------------------------------------- fee admin ---

    function test_setCollectionFeeParams_updatesCurve_noRedeploy() public {
        uint256 before = fees.collectionCreationFee(5);

        vm.expectEmit(false, false, false, true, address(fees));
        emit CollectionFeeParamsChanged(abi.encode(uint256(1 ether), uint256(0)));
        vm.prank(admin);
        fees.setCollectionFeeParams(abi.encode(uint256(1 ether), uint256(0)));

        assertEq(fees.collectionCreationFee(5), 1 ether);
        assertTrue(fees.collectionCreationFee(5) != before);
    }

    function test_setCollectionFeeParams_overCap_reverts() public {
        uint256 cap = fees.MAX_CURVE_FEE_AT_MAX_N();
        vm.expectRevert(IFeeConfig.FeeOutOfBounds.selector);
        vm.prank(admin);
        fees.setCollectionFeeParams(abi.encode(cap + 1, uint256(0)));
    }

    function test_setMintFeeParams_updatesCurve() public {
        vm.prank(admin);
        fees.setMintFeeParams(abi.encode(uint256(0.5 ether), uint256(0)));
        assertEq(fees.mintFee(1), 0.5 ether);
    }

    function test_setMintFeeParams_overCap_reverts() public {
        uint256 cap = fees.MAX_CURVE_FEE_AT_MAX_N();
        vm.expectRevert(IFeeConfig.FeeOutOfBounds.selector);
        vm.prank(admin);
        fees.setMintFeeParams(abi.encode(uint256(0), cap)); // slope alone blows the cap at n=20
    }

    function test_setMarketplaceFeeBps_updates() public {
        vm.expectEmit(false, false, false, true, address(fees));
        emit MarketplaceFeeChanged(500);
        vm.prank(admin);
        fees.setMarketplaceFeeBps(500);
        assertEq(fees.marketplaceFeeBps(), 500);
    }

    function test_setMarketplaceFeeBps_overCap_reverts() public {
        uint16 cap = fees.MAX_MARKETPLACE_FEE_BPS();
        vm.expectRevert(IFeeConfig.FeeOutOfBounds.selector);
        vm.prank(admin);
        fees.setMarketplaceFeeBps(cap + 1);
    }

    function test_setFeeRecipient_updates() public {
        vm.expectEmit(false, false, false, true, address(fees));
        emit FeeRecipientChanged(treasury2);
        vm.prank(admin);
        fees.setFeeRecipient(treasury2);
        assertEq(fees.feeRecipient(), treasury2);
    }

    function test_setFeeRecipient_zeroAddress_reverts() public {
        vm.expectRevert(FeeConfig.ZeroAddress.selector);
        vm.prank(admin);
        fees.setFeeRecipient(address(0));
    }

    // ------------------------------------------- royalty / Issue #3 resolution ---

    function _createCollection() internal returns (uint256 id) {
        uint256 fee = coll.quoteCollectionCreationFee(1);
        address creator = makeAddr("creator");
        vm.deal(creator, fee);
        vm.prank(creator);
        id = coll.createCollection{value: fee}(
            ICollection.CreateParams({name: "c", metadataURI: "", expectedComponentCount: 1})
        );
    }

    function test_setRoyaltyBps_realCollection_succeeds() public {
        uint256 id = _createCollection();
        vm.expectEmit(true, false, false, true, address(fees));
        emit RoyaltyChanged(id, 500);
        vm.prank(admin);
        fees.setRoyaltyBps(id, 500);
        assertEq(fees.royaltyBps(id), 500);
    }

    function test_setRoyaltyBps_unknownCollection_reverts() public {
        vm.expectRevert(abi.encodeWithSelector(FeeConfig.UnknownCollection.selector, 999));
        vm.prank(admin);
        fees.setRoyaltyBps(999, 500);
    }

    function test_setRoyaltyBps_overCap_reverts() public {
        uint256 id = _createCollection();
        uint16 cap = fees.MAX_ROYALTY_BPS();
        vm.expectRevert(IFeeConfig.FeeOutOfBounds.selector);
        vm.prank(admin);
        fees.setRoyaltyBps(id, cap + 1);
    }

    /// The exact scenario `docs/OPEN_ISSUES.md`'s former Issue #3 described:
    /// before this fix, nothing stopped `FEE_ADMIN_ROLE` from configuring a
    /// royalty for a `collectionId` that was never created, which would have
    /// made `Marketplace._settle` revert with `UnknownCollection` for every
    /// sale of any NFFC minted with that same bogus id. Now it can't happen —
    /// the royalty itself is refused at set-time.
    function test_setRoyaltyBps_neverAccidentallyConfigurableForNonexistentCollection() public {
        vm.expectRevert(abi.encodeWithSelector(FeeConfig.UnknownCollection.selector, 42));
        vm.prank(admin);
        fees.setRoyaltyBps(42, 100);
        assertEq(fees.royaltyBps(42), 0); // still the harmless default
    }

    function test_setRoyaltyBps_beforeCollectionWired_reverts() public {
        vm.prank(admin);
        FeeConfig unwired =
            new FeeConfig(admin, COLLECTION_BASE, COLLECTION_SLOPE, MINT_BASE, MINT_SLOPE, MARKETPLACE_BPS, treasury);
        vm.expectRevert(abi.encodeWithSelector(FeeConfig.UnknownCollection.selector, 1));
        vm.prank(admin);
        unwired.setRoyaltyBps(1, 100);
    }

    // ----------------------------------------------------------- setCollection ---

    function test_setCollection_zeroAddress_reverts() public {
        vm.expectRevert(FeeConfig.ZeroAddress.selector);
        vm.prank(admin);
        fees.setCollection(address(0));
    }

    function test_setCollection_emitsEvent() public {
        vm.expectEmit(false, false, false, true, address(fees));
        emit CollectionSet(address(coll));
        vm.prank(admin);
        fees.setCollection(address(coll));
    }
}
