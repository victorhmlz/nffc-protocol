// SPDX-License-Identifier: MIT
pragma solidity 0.8.34;

import {Test} from "forge-std/Test.sol";
import {IAccessControl} from "@openzeppelin/contracts/access/IAccessControl.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {IERC721Errors} from "@openzeppelin/contracts/interfaces/draft-IERC6093.sol";

import {AssetIdentityRegistry} from "./AssetIdentityRegistry.sol";
import {RepresentationRegistry} from "./RepresentationRegistry.sol";
import {IRepresentationRegistry} from "./interfaces/IRepresentationRegistry.sol";
import {INFFC} from "./interfaces/INFFC.sol";
import {NFFC} from "./NFFC.sol";
import {Collection} from "./Collection.sol";
import {ICollection} from "./interfaces/ICollection.sol";
import {Marketplace} from "./Marketplace.sol";
import {IMarketplace} from "./interfaces/IMarketplace.sol";
import {MockFeeConfig} from "./mocks/MockFeeConfig.sol";
import {MockERC20} from "./mocks/MockERC20.sol";
import {RejectEther} from "./mocks/FeeRecipients.sol";
import {ReenterOnReceiveMarketplace} from "./mocks/MarketplaceAttackers.sol";

contract MarketplaceTest is Test {
    event ListingCreated(uint256 indexed tokenId, address indexed seller, uint256 price);
    event ListingCancelled(uint256 indexed tokenId, address indexed seller);
    event Sale(
        uint256 indexed tokenId,
        address indexed seller,
        address indexed buyer,
        uint256 price,
        uint256 feePaid,
        uint256 royaltyPaid
    );
    event OfferCreated(
        uint256 indexed offerId, uint256 indexed tokenId, address indexed buyer, uint256 price, uint64 expiry
    );
    event OfferCancelled(uint256 indexed offerId);
    event OfferAccepted(uint256 indexed offerId, uint256 indexed tokenId, address seller, address buyer, uint256 price);

    bytes32 internal constant CRYPTO_NATIVE = bytes32("CRYPTO_NATIVE");
    bytes32 internal constant CRYPTO = bytes32("CRYPTO");
    bytes32 internal constant ERC20 = bytes32("ERC20");
    uint256 internal constant CHAIN = 4663;
    uint16 internal constant BPS_TOTAL = 10_000;

    AssetIdentityRegistry internal assets;
    RepresentationRegistry internal reps;
    NFFC internal nffc;
    Collection internal coll;
    MockFeeConfig internal fees;
    Marketplace internal mkt;

    address internal admin = makeAddr("admin");
    address internal alice = makeAddr("alice");
    address internal bob = makeAddr("bob");
    address internal carol = makeAddr("carol");
    address internal treasury = makeAddr("treasury");

    bytes32 internal btc;
    bytes32 internal btcRep;

    function setUp() public {
        assets = new AssetIdentityRegistry(admin);
        reps = new RepresentationRegistry(admin, address(assets));
        vm.prank(admin);
        reps.registerProvider(CRYPTO_NATIVE, address(0));

        MockERC20 token = new MockERC20("BTC", "BTC", 18);
        vm.startPrank(admin);
        btc = assets.registerAssetIdentity("BTC", "BTC", CRYPTO);
        btcRep = reps.registerRepresentation(
            IRepresentationRegistry.RegisterParams({
                assetId: btc,
                providerId: CRYPTO_NATIVE,
                chainId: CHAIN,
                token: address(token),
                tokenStandard: ERC20,
                decimals: 18,
                multiplier: 1e18,
                oracle: IRepresentationRegistry.OracleMetadata({feed: address(0xFEED), heartbeat: 3600, feedDecimals: 8})
            })
        );
        vm.stopPrank();

        fees = new MockFeeConfig(0, 0, treasury);
        nffc = new NFFC(admin, address(assets), address(reps), address(fees));
        coll = new Collection(admin, address(fees));
        mkt = new Marketplace(admin, address(nffc), address(coll), address(fees));
    }

    // --------------------------------------------------------------- helpers ---

    function _mint(address who, uint256 collectionId) internal returns (uint256 tokenId) {
        INFFC.Component[] memory comps = new INFFC.Component[](1);
        comps[0] = INFFC.Component({assetId: btc, representationId: btcRep, weightBps: BPS_TOTAL});
        vm.prank(who);
        tokenId =
            nffc.mint(INFFC.MintParams({collectionId: collectionId, components: comps, staticMetadataURI: "ipfs://m"}));
    }

    function _createCollection(address who) internal returns (uint256 collectionId) {
        vm.prank(who);
        collectionId =
            coll.createCollection(ICollection.CreateParams({name: "c", metadataURI: "", expectedComponentCount: 1}));
    }

    /// Mints a token into a fresh collection owned by `creator`, then (if
    /// different) transfers it to `owner` — so seller and royalty-recipient can
    /// be tested as distinct parties.
    function _mintInCollection(address creator, address owner) internal returns (uint256 tokenId, uint256 collectionId) {
        collectionId = _createCollection(creator);
        tokenId = _mint(creator, collectionId);
        if (owner != creator) {
            vm.prank(creator);
            nffc.transferFrom(creator, owner, tokenId);
        }
    }

    function _listAndApprove(address seller, uint256 tokenId, uint256 price) internal {
        vm.startPrank(seller);
        nffc.approve(address(mkt), tokenId);
        mkt.createListing(tokenId, price);
        vm.stopPrank();
    }

    // ============================================================= listings ===

    function test_createListing_happyPath() public {
        uint256 tokenId = _mint(alice, 0);
        vm.expectEmit(true, true, false, true, address(mkt));
        emit ListingCreated(tokenId, alice, 1 ether);
        vm.prank(alice);
        mkt.createListing(tokenId, 1 ether);

        IMarketplace.Listing memory l = mkt.getListing(tokenId);
        assertEq(l.tokenId, tokenId);
        assertEq(l.seller, alice);
        assertEq(l.price, 1 ether);
        assertTrue(l.active);
    }

    function test_createListing_notOwner_reverts() public {
        uint256 tokenId = _mint(alice, 0);
        vm.prank(bob);
        vm.expectRevert(abi.encodeWithSelector(IMarketplace.NotTokenOwner.selector, tokenId, bob));
        mkt.createListing(tokenId, 1 ether);
    }

    function test_createListing_nonexistentToken_reverts() public {
        vm.expectRevert(abi.encodeWithSelector(IERC721Errors.ERC721NonexistentToken.selector, 999));
        mkt.createListing(999, 1 ether);
    }

    function test_createListing_overwritesPreviousPrice() public {
        uint256 tokenId = _mint(alice, 0);
        vm.startPrank(alice);
        mkt.createListing(tokenId, 1 ether);
        mkt.createListing(tokenId, 2 ether);
        vm.stopPrank();
        assertEq(mkt.getListing(tokenId).price, 2 ether);
    }

    function test_cancelListing_bySeller_ok() public {
        uint256 tokenId = _mint(alice, 0);
        vm.startPrank(alice);
        mkt.createListing(tokenId, 1 ether);
        vm.expectEmit(true, true, false, false, address(mkt));
        emit ListingCancelled(tokenId, alice);
        mkt.cancelListing(tokenId);
        vm.stopPrank();
        assertFalse(mkt.getListing(tokenId).active);
    }

    /// Acceptance: cancelling another seller's listing is impossible, under any
    /// tested caller — a stranger, the buyer, and even the protocol admin.
    function test_cancelListing_byNonSeller_reverts() public {
        uint256 tokenId = _mint(alice, 0);
        vm.prank(alice);
        mkt.createListing(tokenId, 1 ether);

        address[3] memory callers = [bob, carol, admin];
        for (uint256 i; i < callers.length; ++i) {
            vm.prank(callers[i]);
            vm.expectRevert(IMarketplace.CannotCancelOthersListing.selector);
            mkt.cancelListing(tokenId);
        }
        assertTrue(mkt.getListing(tokenId).active);
    }

    function testFuzz_cancelListing_onlySeller(address caller) public {
        vm.assume(caller != alice);
        uint256 tokenId = _mint(alice, 0);
        vm.prank(alice);
        mkt.createListing(tokenId, 1 ether);

        vm.prank(caller);
        vm.expectRevert(IMarketplace.CannotCancelOthersListing.selector);
        mkt.cancelListing(tokenId);
    }

    function test_cancelListing_notActive_reverts() public {
        uint256 tokenId = _mint(alice, 0);
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(IMarketplace.ListingNotActive.selector, tokenId));
        mkt.cancelListing(tokenId);
    }

    function test_cancelListing_worksWhilePaused() public {
        uint256 tokenId = _mint(alice, 0);
        vm.prank(alice);
        mkt.createListing(tokenId, 1 ether);

        vm.prank(admin);
        mkt.pause();

        vm.prank(alice);
        mkt.cancelListing(tokenId); // does not revert — cancellation is never paused
        assertFalse(mkt.getListing(tokenId).active);
    }

    function test_createListing_whilePaused_reverts() public {
        uint256 tokenId = _mint(alice, 0);
        vm.prank(admin);
        mkt.pause();
        vm.prank(alice);
        vm.expectRevert(Pausable.EnforcedPause.selector);
        mkt.createListing(tokenId, 1 ether);
    }

    // ==================================================================== buy ===

    function test_buy_happyPath_noFeesNoRoyalty() public {
        uint256 tokenId = _mint(alice, 0);
        _listAndApprove(alice, tokenId, 1 ether);

        vm.deal(bob, 1 ether);
        vm.expectEmit(true, true, true, true, address(mkt));
        emit Sale(tokenId, alice, bob, 1 ether, 0, 0);
        vm.prank(bob);
        mkt.buy{value: 1 ether}(tokenId);

        assertEq(nffc.ownerOf(tokenId), bob);
        assertEq(alice.balance, 1 ether);
        assertFalse(mkt.getListing(tokenId).active);
    }

    function test_buy_feeAndRoyaltySplit() public {
        fees.setMarketplaceFeeBps(500); // 5%
        (uint256 tokenId, uint256 collectionId) = _mintInCollection(carol, alice); // carol creates+owns the collection, alice ends up holding + selling the token
        fees.setRoyaltyBps(collectionId, 250); // 2.5%
        _listAndApprove(alice, tokenId, 1 ether);

        vm.deal(bob, 1 ether);
        uint256 expectedFee = 0.05 ether;
        uint256 expectedRoyalty = 0.025 ether;
        uint256 expectedProceeds = 1 ether - expectedFee - expectedRoyalty;

        vm.expectEmit(true, true, true, true, address(mkt));
        emit Sale(tokenId, alice, bob, 1 ether, expectedFee, expectedRoyalty);
        vm.prank(bob);
        mkt.buy{value: 1 ether}(tokenId);

        assertEq(nffc.ownerOf(tokenId), bob);
        assertEq(treasury.balance, expectedFee);
        assertEq(carol.balance, expectedRoyalty); // carol is the collection creator, not the seller
        assertEq(alice.balance, expectedProceeds);
    }

    function testFuzz_buy_feeRoyaltySplit_conservesValue(uint16 feeBps, uint16 royBps, uint96 priceRaw) public {
        feeBps = uint16(bound(feeBps, 0, 5000));
        royBps = uint16(bound(royBps, 0, 5000)); // fee+roy <= 10_000 always with both capped at 5_000
        uint256 price = bound(priceRaw, 1, 1000 ether);

        fees.setMarketplaceFeeBps(feeBps);
        (uint256 tokenId, uint256 collectionId) = _mintInCollection(carol, alice);
        fees.setRoyaltyBps(collectionId, royBps);
        _listAndApprove(alice, tokenId, price);

        vm.deal(bob, price);
        vm.prank(bob);
        mkt.buy{value: price}(tokenId);

        uint256 expectedFee = (price * feeBps) / BPS_TOTAL;
        uint256 expectedRoyalty = (price * royBps) / BPS_TOTAL;
        assertEq(treasury.balance, expectedFee);
        assertEq(carol.balance, expectedRoyalty);
        assertEq(alice.balance, price - expectedFee - expectedRoyalty);
        assertEq(nffc.ownerOf(tokenId), bob);
    }

    /// TASK-32 hardening: property version of `test_buy_underpay_reverts` /
    /// `test_buy_overpay_reverts` — for any listed price and any mismatched
    /// `msg.value` at all, `buy` reverts and the listing stays active (no
    /// partial-payment path, no rounding tolerance).
    function testFuzz_buy_priceMismatch_reverts(uint96 priceRaw, uint96 sentRaw) public {
        uint256 price = bound(priceRaw, 1, 1000 ether);
        uint256 sent = bound(sentRaw, 0, 1000 ether);
        vm.assume(sent != price);

        uint256 tokenId = _mint(alice, 0);
        _listAndApprove(alice, tokenId, price);

        vm.deal(bob, sent);
        vm.prank(bob);
        vm.expectRevert(abi.encodeWithSelector(IMarketplace.PriceMismatch.selector, sent, price));
        mkt.buy{value: sent}(tokenId);

        assertTrue(mkt.getListing(tokenId).active);
    }

    function test_buy_underpay_reverts() public {
        uint256 tokenId = _mint(alice, 0);
        _listAndApprove(alice, tokenId, 1 ether);
        vm.deal(bob, 1 ether);
        vm.prank(bob);
        vm.expectRevert(abi.encodeWithSelector(IMarketplace.PriceMismatch.selector, 0.9 ether, 1 ether));
        mkt.buy{value: 0.9 ether}(tokenId);
    }

    function test_buy_overpay_reverts() public {
        uint256 tokenId = _mint(alice, 0);
        _listAndApprove(alice, tokenId, 1 ether);
        vm.deal(bob, 2 ether);
        vm.prank(bob);
        vm.expectRevert(abi.encodeWithSelector(IMarketplace.PriceMismatch.selector, 1.1 ether, 1 ether));
        mkt.buy{value: 1.1 ether}(tokenId);
    }

    function test_buy_notActive_reverts() public {
        uint256 tokenId = _mint(alice, 0);
        vm.deal(bob, 1 ether);
        vm.prank(bob);
        vm.expectRevert(abi.encodeWithSelector(IMarketplace.ListingNotActive.selector, tokenId));
        mkt.buy{value: 1 ether}(tokenId);
    }

    function test_buy_cancelledListing_reverts() public {
        uint256 tokenId = _mint(alice, 0);
        vm.startPrank(alice);
        mkt.createListing(tokenId, 1 ether);
        mkt.cancelListing(tokenId);
        vm.stopPrank();

        vm.deal(bob, 1 ether);
        vm.prank(bob);
        vm.expectRevert(abi.encodeWithSelector(IMarketplace.ListingNotActive.selector, tokenId));
        mkt.buy{value: 1 ether}(tokenId);
    }

    function test_buy_notApproved_reverts() public {
        uint256 tokenId = _mint(alice, 0);
        vm.prank(alice);
        mkt.createListing(tokenId, 1 ether); // never approved the marketplace
        vm.deal(bob, 1 ether);
        vm.prank(bob);
        vm.expectRevert(); // OZ ERC721InsufficientApproval (checked inside safeTransferFrom) — the marketplace never reimplements this
        mkt.buy{value: 1 ether}(tokenId);
    }

    function test_buy_staleListing_afterDirectTransfer_reverts() public {
        uint256 tokenId = _mint(alice, 0);
        _listAndApprove(alice, tokenId, 1 ether);

        vm.prank(alice);
        nffc.transferFrom(alice, carol, tokenId); // sold/gifted outside the marketplace

        vm.deal(bob, 1 ether);
        vm.prank(bob);
        vm.expectRevert(abi.encodeWithSelector(IMarketplace.ListingNotActive.selector, tokenId));
        mkt.buy{value: 1 ether}(tokenId);
        assertEq(nffc.ownerOf(tokenId), carol);
        assertEq(bob.balance, 1 ether); // never charged
    }

    function test_buy_whilePaused_reverts() public {
        uint256 tokenId = _mint(alice, 0);
        _listAndApprove(alice, tokenId, 1 ether);
        vm.prank(admin);
        mkt.pause();

        vm.deal(bob, 1 ether);
        vm.prank(bob);
        vm.expectRevert(Pausable.EnforcedPause.selector);
        mkt.buy{value: 1 ether}(tokenId);
    }

    function test_buy_feeRecipientRejectsEther_reverts() public {
        RejectEther sink = new RejectEther();
        fees.setMarketplaceFeeBps(500);
        fees.setFeeRecipient(address(sink));

        uint256 tokenId = _mint(alice, 0);
        _listAndApprove(alice, tokenId, 1 ether);
        vm.deal(bob, 1 ether);
        vm.prank(bob);
        vm.expectRevert(Marketplace.FeeTransferFailed.selector);
        mkt.buy{value: 1 ether}(tokenId);

        // no partial effects survive the revert
        assertEq(nffc.ownerOf(tokenId), alice);
        assertTrue(mkt.getListing(tokenId).active);
    }

    /// Acceptance: reentrancy protection on every value-moving path. The fee
    /// recipient re-enters `buy` on a second listing the instant it is paid; the
    /// inner call is blocked by the shared `nonReentrant` lock, which bubbles up
    /// and fails the outer fee transfer.
    function test_buy_reentrancy_blocked() public {
        ReenterOnReceiveMarketplace attacker = new ReenterOnReceiveMarketplace();
        fees.setMarketplaceFeeBps(500);
        fees.setFeeRecipient(address(attacker));
        vm.deal(address(attacker), 1 ether); // enough to fully fund its own reentrant buy()

        uint256 tokenId1 = _mint(alice, 0);
        uint256 tokenId2 = _mint(alice, 0);
        _listAndApprove(alice, tokenId1, 1 ether);
        _listAndApprove(alice, tokenId2, 1 ether);

        attacker.arm(address(mkt), abi.encodeCall(Marketplace.buy, (tokenId2)), 1 ether);

        vm.deal(bob, 1 ether);
        vm.prank(bob);
        vm.expectRevert(Marketplace.FeeTransferFailed.selector);
        mkt.buy{value: 1 ether}(tokenId1);

        // the reentrant attempt never went through — tokenId2 is still listed.
        assertTrue(mkt.getListing(tokenId2).active);
        assertEq(nffc.ownerOf(tokenId1), alice);
    }

    /// Acceptance, S12: `_settle` moves the NFT with `safeTransferFrom`, so a
    /// contract buyer's `onERC721Received` hook fires *before* any fee/royalty/
    /// proceeds payout. The buyer re-enters `buy` on a second listing from inside
    /// that hook; the shared `nonReentrant` lock (already held since the very
    /// start of the outer `buy`) blocks it just the same.
    function test_buy_reentrancyViaOnERC721Received_blocked() public {
        ReenterOnReceiveMarketplace attackerBuyer = new ReenterOnReceiveMarketplace();
        uint256 tokenId1 = _mint(alice, 0);
        uint256 tokenId2 = _mint(alice, 0);
        _listAndApprove(alice, tokenId1, 1 ether);
        _listAndApprove(alice, tokenId2, 1 ether);

        vm.deal(address(attackerBuyer), 2 ether); // 1 ether for the outer buy, 1 ether for the reentrant attempt
        attackerBuyer.arm(address(mkt), abi.encodeCall(Marketplace.buy, (tokenId2)), 1 ether);

        vm.prank(address(attackerBuyer));
        vm.expectRevert(); // safeTransferFrom bubbles the hook's revert directly (no FeeTransferFailed wrapper here)
        mkt.buy{value: 1 ether}(tokenId1);

        assertTrue(mkt.getListing(tokenId2).active);
        assertEq(nffc.ownerOf(tokenId1), alice);
    }

    // ================================================================= offers ===

    function test_createOffer_escrowsValue() public {
        uint256 tokenId = _mint(alice, 0);
        vm.deal(bob, 1 ether);
        vm.expectEmit(true, true, true, true, address(mkt));
        emit OfferCreated(1, tokenId, bob, 1 ether, uint64(block.timestamp + 1 days));
        vm.prank(bob);
        uint256 offerId = mkt.createOffer{value: 1 ether}(tokenId, uint64(block.timestamp + 1 days));

        assertEq(offerId, 1);
        assertEq(address(mkt).balance, 1 ether);
        IMarketplace.Offer memory o = mkt.getOffer(offerId);
        assertEq(o.buyer, bob);
        assertEq(o.price, 1 ether);
        assertTrue(o.active);
    }

    function test_createOffer_incrementsId() public {
        uint256 tokenId = _mint(alice, 0);
        vm.deal(bob, 2 ether);
        vm.startPrank(bob);
        uint256 a = mkt.createOffer{value: 1 ether}(tokenId, uint64(block.timestamp + 1 days));
        uint256 b = mkt.createOffer{value: 1 ether}(tokenId, uint64(block.timestamp + 1 days));
        vm.stopPrank();
        assertEq(a, 1);
        assertEq(b, 2);
    }

    function test_cancelOffer_byBuyer_refunds() public {
        uint256 tokenId = _mint(alice, 0);
        vm.deal(bob, 1 ether);
        vm.prank(bob);
        uint256 offerId = mkt.createOffer{value: 1 ether}(tokenId, uint64(block.timestamp + 1 days));

        vm.expectEmit(true, false, false, false, address(mkt));
        emit OfferCancelled(offerId);
        vm.prank(bob);
        mkt.cancelOffer(offerId);

        assertEq(bob.balance, 1 ether);
        assertEq(address(mkt).balance, 0);
        assertFalse(mkt.getOffer(offerId).active);
    }

    function test_cancelOffer_byNonBuyer_reverts() public {
        uint256 tokenId = _mint(alice, 0);
        vm.deal(bob, 1 ether);
        vm.prank(bob);
        uint256 offerId = mkt.createOffer{value: 1 ether}(tokenId, uint64(block.timestamp + 1 days));

        vm.prank(carol);
        vm.expectRevert(abi.encodeWithSelector(Marketplace.NotOfferBuyer.selector, offerId, carol));
        mkt.cancelOffer(offerId);
        assertTrue(mkt.getOffer(offerId).active);
    }

    /// TASK-32 hardening: the fixed-caller version above (`test_cancelOffer_
    /// byNonBuyer_reverts`, always `carol`) proves the gate works for one
    /// address; this proves it for every address that isn't the offer's buyer.
    function testFuzz_cancelOffer_onlyBuyer(address caller) public {
        uint256 tokenId = _mint(alice, 0);
        vm.deal(bob, 1 ether);
        vm.prank(bob);
        uint256 offerId = mkt.createOffer{value: 1 ether}(tokenId, uint64(block.timestamp + 1 days));
        vm.assume(caller != bob);

        vm.prank(caller);
        vm.expectRevert(abi.encodeWithSelector(Marketplace.NotOfferBuyer.selector, offerId, caller));
        mkt.cancelOffer(offerId);
        assertTrue(mkt.getOffer(offerId).active);
    }

    function test_cancelOffer_notActive_reverts() public {
        vm.prank(bob);
        vm.expectRevert(abi.encodeWithSelector(IMarketplace.OfferNotActive.selector, 1));
        mkt.cancelOffer(1);
    }

    function test_cancelOffer_worksWhilePaused() public {
        uint256 tokenId = _mint(alice, 0);
        vm.deal(bob, 1 ether);
        vm.prank(bob);
        uint256 offerId = mkt.createOffer{value: 1 ether}(tokenId, uint64(block.timestamp + 1 days));

        vm.prank(admin);
        mkt.pause();

        vm.prank(bob);
        mkt.cancelOffer(offerId); // does not revert
        assertEq(bob.balance, 1 ether);
    }

    function test_acceptOffer_happyPath() public {
        uint256 tokenId = _mint(alice, 0);
        vm.deal(bob, 1 ether);
        vm.prank(bob);
        uint256 offerId = mkt.createOffer{value: 1 ether}(tokenId, uint64(block.timestamp + 1 days));

        vm.startPrank(alice);
        nffc.approve(address(mkt), tokenId);
        vm.expectEmit(true, true, false, true, address(mkt));
        emit OfferAccepted(offerId, tokenId, alice, bob, 1 ether);
        mkt.acceptOffer(offerId);
        vm.stopPrank();

        assertEq(nffc.ownerOf(tokenId), bob);
        assertEq(alice.balance, 1 ether);
        assertFalse(mkt.getOffer(offerId).active);
    }

    function test_acceptOffer_alsoCancelsActiveListing() public {
        uint256 tokenId = _mint(alice, 0);
        _listAndApprove(alice, tokenId, 5 ether); // a much higher ask than the offer

        vm.deal(bob, 1 ether);
        vm.prank(bob);
        uint256 offerId = mkt.createOffer{value: 1 ether}(tokenId, uint64(block.timestamp + 1 days));

        vm.prank(alice);
        mkt.acceptOffer(offerId);

        assertFalse(mkt.getListing(tokenId).active);
        assertEq(nffc.ownerOf(tokenId), bob);
    }

    function test_acceptOffer_notOwner_reverts() public {
        uint256 tokenId = _mint(alice, 0);
        vm.deal(bob, 1 ether);
        vm.prank(bob);
        uint256 offerId = mkt.createOffer{value: 1 ether}(tokenId, uint64(block.timestamp + 1 days));

        vm.prank(carol); // not the token owner
        vm.expectRevert(abi.encodeWithSelector(IMarketplace.NotTokenOwner.selector, tokenId, carol));
        mkt.acceptOffer(offerId);
    }

    /// TASK-32 hardening: the fixed-caller version above (`test_acceptOffer_
    /// notOwner_reverts`, always `carol`) proves the gate works for one address;
    /// this proves it for every address that isn't the token's current owner.
    function testFuzz_acceptOffer_onlyCurrentOwner(address caller) public {
        uint256 tokenId = _mint(alice, 0);
        vm.assume(caller != alice);
        vm.deal(bob, 1 ether);
        vm.prank(bob);
        uint256 offerId = mkt.createOffer{value: 1 ether}(tokenId, uint64(block.timestamp + 1 days));

        vm.prank(caller);
        vm.expectRevert(abi.encodeWithSelector(IMarketplace.NotTokenOwner.selector, tokenId, caller));
        mkt.acceptOffer(offerId);
    }

    /// TASK-32 hardening: property version of `test_acceptOffer_expired_reverts`
    /// / `test_acceptOffer_atExpiryTimestamp_stillAcceptable` — for any expiry
    /// and any current time, acceptance succeeds iff `now <= expiry` (TASK-29
    /// acceptance: strict, inclusive of the exact deadline).
    function testFuzz_acceptOffer_expiryBoundary(uint64 expiryOffset, uint64 warpOffset) public {
        expiryOffset = uint64(bound(expiryOffset, 0, 365 days));
        warpOffset = uint64(bound(warpOffset, 0, 365 days));
        uint256 tokenId = _mint(alice, 0);
        uint64 expiry = uint64(block.timestamp) + expiryOffset;
        vm.deal(bob, 1 ether);
        vm.prank(bob);
        uint256 offerId = mkt.createOffer{value: 1 ether}(tokenId, expiry);

        vm.warp(uint64(block.timestamp) + warpOffset);
        vm.prank(alice);
        nffc.approve(address(mkt), tokenId);

        if (block.timestamp > expiry) {
            vm.prank(alice);
            vm.expectRevert(abi.encodeWithSelector(IMarketplace.OfferExpired.selector, offerId, expiry));
            mkt.acceptOffer(offerId);
        } else {
            vm.prank(alice);
            mkt.acceptOffer(offerId); // does not revert
            assertEq(nffc.ownerOf(tokenId), bob);
        }
    }

    /// Acceptance: an expired offer is not acceptable on-chain even if the caller
    /// (or a stale UI) still thinks it is live.
    function test_acceptOffer_expired_reverts() public {
        uint256 tokenId = _mint(alice, 0);
        uint64 expiry = uint64(block.timestamp + 1 hours);
        vm.deal(bob, 1 ether);
        vm.prank(bob);
        uint256 offerId = mkt.createOffer{value: 1 ether}(tokenId, expiry);

        vm.warp(expiry + 1);
        vm.prank(alice);
        nffc.approve(address(mkt), tokenId);
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(IMarketplace.OfferExpired.selector, offerId, expiry));
        mkt.acceptOffer(offerId);
    }

    function test_acceptOffer_atExpiryTimestamp_stillAcceptable() public {
        uint256 tokenId = _mint(alice, 0);
        uint64 expiry = uint64(block.timestamp + 1 hours);
        vm.deal(bob, 1 ether);
        vm.prank(bob);
        uint256 offerId = mkt.createOffer{value: 1 ether}(tokenId, expiry);

        vm.warp(expiry); // exactly at the deadline — still valid
        vm.prank(alice);
        nffc.approve(address(mkt), tokenId);
        vm.prank(alice);
        mkt.acceptOffer(offerId); // does not revert
        assertEq(nffc.ownerOf(tokenId), bob);
    }

    function test_acceptOffer_notActive_reverts() public {
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(IMarketplace.OfferNotActive.selector, 1));
        mkt.acceptOffer(1);
    }

    function test_acceptOffer_whilePaused_reverts() public {
        uint256 tokenId = _mint(alice, 0);
        vm.deal(bob, 1 ether);
        vm.prank(bob);
        uint256 offerId = mkt.createOffer{value: 1 ether}(tokenId, uint64(block.timestamp + 1 days));

        vm.prank(admin);
        mkt.pause();

        vm.prank(alice);
        vm.expectRevert(Pausable.EnforcedPause.selector);
        mkt.acceptOffer(offerId);
    }

    /// Acceptance: reentrancy protection on `acceptOffer`'s payout leg — the
    /// seller re-enters `cancelOffer` on a *different*, still-active offer the
    /// instant it is paid its proceeds.
    function test_acceptOffer_reentrancy_blocked() public {
        ReenterOnReceiveMarketplace attackerSeller = new ReenterOnReceiveMarketplace();
        uint256 tokenId = _mint(address(attackerSeller), 0);

        vm.deal(bob, 2 ether);
        vm.startPrank(bob);
        uint256 offerToAccept = mkt.createOffer{value: 1 ether}(tokenId, uint64(block.timestamp + 1 days));
        uint256 otherOffer = mkt.createOffer{value: 1 ether}(tokenId, uint64(block.timestamp + 1 days));
        vm.stopPrank();

        attackerSeller.execute(
            address(nffc), abi.encodeCall(nffc.approve, (address(mkt), tokenId)), 0
        );
        attackerSeller.arm(address(mkt), abi.encodeCall(Marketplace.cancelOffer, (otherOffer)));

        vm.prank(address(attackerSeller));
        vm.expectRevert(Marketplace.FeeTransferFailed.selector);
        mkt.acceptOffer(offerToAccept);

        // the reentrant cancelOffer never went through — bob's other offer is
        // still active and its escrow untouched.
        assertTrue(mkt.getOffer(otherOffer).active);
        assertEq(address(mkt).balance, 2 ether);
    }

    /// Acceptance: reentrancy protection on `cancelOffer`'s refund leg — the
    /// buyer re-enters `buy` on an active listing the instant it is refunded.
    function test_cancelOffer_reentrancy_blocked() public {
        ReenterOnReceiveMarketplace attackerBuyer = new ReenterOnReceiveMarketplace();
        uint256 tokenId = _mint(alice, 0);
        _listAndApprove(alice, tokenId, 1 ether);

        vm.deal(address(attackerBuyer), 1 ether);
        vm.prank(address(attackerBuyer));
        uint256 offerId = mkt.createOffer{value: 1 ether}(tokenId + 1_000_000, uint64(block.timestamp + 1 days)); // an offer on an unrelated tokenId, just to hold escrow

        attackerBuyer.arm(address(mkt), abi.encodeCall(Marketplace.buy, (tokenId)), 1 ether);

        vm.prank(address(attackerBuyer));
        vm.expectRevert(Marketplace.FeeTransferFailed.selector);
        mkt.cancelOffer(offerId);

        // the reentrant buy never went through.
        assertTrue(mkt.getListing(tokenId).active);
        assertEq(nffc.ownerOf(tokenId), alice);
    }

    // ------------------------------------------------------------- pausing ---

    function test_pause_onlyPauser() public {
        bytes32 role = mkt.PAUSER_ROLE();
        vm.prank(bob);
        vm.expectRevert(abi.encodeWithSelector(IAccessControl.AccessControlUnauthorizedAccount.selector, bob, role));
        mkt.pause();
    }

    /// TASK-32 hardening — see `NFFC.t.sol`'s `testFuzz_pause_onlyPauser` for
    /// the same property on the mint path.
    function testFuzz_pause_onlyPauser(address caller) public {
        vm.assume(caller != admin);
        bytes32 role = mkt.PAUSER_ROLE();
        vm.prank(caller);
        vm.expectRevert(abi.encodeWithSelector(IAccessControl.AccessControlUnauthorizedAccount.selector, caller, role));
        mkt.pause();
    }

    function test_unpause_restoresCreateListing() public {
        uint256 tokenId = _mint(alice, 0);
        vm.startPrank(admin);
        mkt.pause();
        mkt.unpause();
        vm.stopPrank();

        vm.prank(alice);
        mkt.createListing(tokenId, 1 ether); // does not revert
    }

    // -------------------------------------------------------- construction ---

    function test_constructor_rejectsZeroAdmin() public {
        vm.expectRevert(Marketplace.ZeroAddress.selector);
        new Marketplace(address(0), address(nffc), address(coll), address(fees));
    }

    function test_constructor_rejectsZeroNffc() public {
        vm.expectRevert(Marketplace.ZeroAddress.selector);
        new Marketplace(admin, address(0), address(coll), address(fees));
    }

    function test_constructor_rejectsZeroCollection() public {
        vm.expectRevert(Marketplace.ZeroAddress.selector);
        new Marketplace(admin, address(nffc), address(0), address(fees));
    }

    function test_constructor_rejectsZeroFeeConfig() public {
        vm.expectRevert(Marketplace.ZeroAddress.selector);
        new Marketplace(admin, address(nffc), address(coll), address(0));
    }
}
