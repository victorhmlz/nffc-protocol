// SPDX-License-Identifier: MIT
pragma solidity 0.8.34;

import {Test} from "forge-std/Test.sol";
import {IAccessControl} from "@openzeppelin/contracts/access/IAccessControl.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {IERC721Errors} from "@openzeppelin/contracts/interfaces/draft-IERC6093.sol";

import {AssetIdentityRegistry} from "./AssetIdentityRegistry.sol";
import {RepresentationRegistry} from "./RepresentationRegistry.sol";
import {IAssetIdentityRegistry} from "./interfaces/IAssetIdentityRegistry.sol";
import {IRepresentationRegistry} from "./interfaces/IRepresentationRegistry.sol";
import {INFFC} from "./interfaces/INFFC.sol";
import {NFFC} from "./NFFC.sol";
import {CompositionSegmentLib} from "./lib/CompositionSegmentLib.sol";
import {StaticRarityLib} from "./lib/StaticRarityLib.sol";
import {MockERC20} from "./mocks/MockERC20.sol";
import {MockFeeConfig} from "./mocks/MockFeeConfig.sol";
import {RejectEther} from "./mocks/FeeRecipients.sol";

contract NFFCTest is Test {
    // re-declared locally so `vm.expectEmit` matches without importing an event ref
    event NFFCMinted(
        uint256 indexed tokenId,
        uint256 indexed collectionId,
        address indexed creator,
        bytes32 compositionHash,
        uint16 componentCount
    );
    event NFFCCompositionRecorded(uint256 indexed tokenId, INFFC.Component[] components);

    uint8 internal constant CRYPTO_ONLY = uint8(CompositionSegmentLib.Segment.CRYPTO_ONLY);
    uint8 internal constant STOCK_ONLY = uint8(CompositionSegmentLib.Segment.STOCK_ONLY);
    uint8 internal constant MIXED = uint8(CompositionSegmentLib.Segment.MIXED);

    uint16 internal constant BPS_TOTAL = 10_000;
    bytes32 internal constant ROBINHOOD = bytes32("ROBINHOOD");
    bytes32 internal constant CRYPTO_NATIVE = bytes32("CRYPTO_NATIVE");
    bytes32 internal constant EQUITY = bytes32("EQUITY");
    bytes32 internal constant CRYPTO = bytes32("CRYPTO");
    bytes32 internal constant ERC20 = bytes32("ERC20");
    uint256 internal constant CHAIN = 4663;

    AssetIdentityRegistry internal assets;
    RepresentationRegistry internal reps;
    MockFeeConfig internal fees;
    NFFC internal nffc;

    address internal admin = makeAddr("admin");
    address internal alice = makeAddr("alice");
    address internal bob = makeAddr("bob");
    address internal treasury = makeAddr("treasury");

    bytes32 internal nvda;
    bytes32 internal nvdaRep;
    bytes32 internal aapl;
    bytes32 internal aaplRep;
    bytes32 internal btc;
    bytes32 internal btcRep;
    bytes32 internal eth;
    bytes32 internal ethRep;

    // a pool of interchangeable crypto assets for the component-count cases
    bytes32[21] internal poolAsset;
    bytes32[21] internal poolRep;

    function setUp() public {
        assets = new AssetIdentityRegistry(admin);
        reps = new RepresentationRegistry(admin, address(assets));

        vm.startPrank(admin);
        reps.registerProvider(ROBINHOOD, address(0));
        reps.registerProvider(CRYPTO_NATIVE, address(0));
        vm.stopPrank();

        (nvda, nvdaRep) = _register("NVDA", EQUITY, ROBINHOOD);
        (aapl, aaplRep) = _register("AAPL", EQUITY, ROBINHOOD);
        (btc, btcRep) = _register("BTC", CRYPTO, CRYPTO_NATIVE);
        (eth, ethRep) = _register("ETH", CRYPTO, CRYPTO_NATIVE);

        for (uint256 i; i < poolAsset.length; ++i) {
            (poolAsset[i], poolRep[i]) =
                _register(string.concat("C", vm.toString(i)), CRYPTO, CRYPTO_NATIVE);
        }

        fees = new MockFeeConfig(0, 0, treasury); // zero mint fee by default — see the "fees" section below
        nffc = new NFFC(admin, address(assets), address(reps), address(fees));
    }

    // --------------------------------------------------------------- helpers ---

    function _register(string memory symbol, bytes32 assetClass, bytes32 providerId)
        internal
        returns (bytes32 assetId, bytes32 repId)
    {
        MockERC20 token = new MockERC20(symbol, symbol, 18);
        vm.startPrank(admin);
        assetId = assets.registerAssetIdentity(symbol, symbol, assetClass);
        repId = reps.registerRepresentation(
            IRepresentationRegistry.RegisterParams({
                assetId: assetId,
                providerId: providerId,
                chainId: CHAIN,
                token: address(token),
                tokenStandard: ERC20,
                decimals: 18,
                multiplier: 1e18,
                oracle: IRepresentationRegistry.OracleMetadata({feed: address(0xFEED), heartbeat: 3600, feedDecimals: 8})
            })
        );
        vm.stopPrank();
    }

    function _c(bytes32 assetId, bytes32 repId, uint16 w) internal pure returns (INFFC.Component memory) {
        return INFFC.Component({assetId: assetId, representationId: repId, weightBps: w});
    }

    function _arr(INFFC.Component memory a) internal pure returns (INFFC.Component[] memory x) {
        x = new INFFC.Component[](1);
        x[0] = a;
    }

    function _arr(INFFC.Component memory a, INFFC.Component memory b)
        internal
        pure
        returns (INFFC.Component[] memory x)
    {
        x = new INFFC.Component[](2);
        x[0] = a;
        x[1] = b;
    }

    function _params(uint256 collectionId, INFFC.Component[] memory comps)
        internal
        pure
        returns (INFFC.MintParams memory)
    {
        return INFFC.MintParams({collectionId: collectionId, components: comps, staticMetadataURI: "ipfs://meta"});
    }

    /// k crypto components from the pool, weights summing to exactly 10_000.
    function _cryptoComps(uint256 k) internal view returns (INFFC.Component[] memory comps) {
        comps = new INFFC.Component[](k);
        uint16 base = uint16(BPS_TOTAL / k);
        uint16 rem = uint16(BPS_TOTAL - base * k);
        for (uint256 i; i < k; ++i) {
            comps[i] = _c(poolAsset[i], poolRep[i], i == 0 ? base + rem : base);
        }
    }

    function _mint(address who, INFFC.Component[] memory comps) internal returns (uint256 tokenId) {
        vm.prank(who);
        tokenId = nffc.mint(_params(0, comps));
    }

    // ------------------------------------------------------------ happy path ---

    function test_mint_happyPath() public {
        INFFC.Component[] memory comps = _arr(_c(nvda, nvdaRep, 6000), _c(btc, btcRep, 4000));
        bytes32 expHash = keccak256(abi.encode(comps));

        vm.expectEmit(true, true, true, true, address(nffc));
        emit NFFCMinted(1, 42, alice, expHash, 2);
        vm.expectEmit(true, true, true, true, address(nffc));
        emit NFFCCompositionRecorded(1, comps);

        vm.prank(alice);
        uint256 tokenId = nffc.mint(_params(42, comps));

        assertEq(tokenId, 1);
        assertEq(nffc.ownerOf(1), alice);
        assertEq(nffc.tokenURI(1), "ipfs://meta");
        assertEq(nffc.getCompositionHash(1), expHash);
        assertEq(nffc.getSegment(1), MIXED);
        uint16[] memory w = new uint16[](2);
        (w[0], w[1]) = (6000, 4000);
        assertEq(nffc.getStaticRarity(1), StaticRarityLib.score(w));
        assertGt(nffc.getStaticRarity(1), 0);
        assertEq(nffc.getCollectionId(1), 42);

        INFFC.Component[] memory stored = nffc.getComposition(1);
        assertEq(stored.length, 2);
        assertEq(stored[0].assetId, nvda);
        assertEq(stored[0].representationId, nvdaRep);
        assertEq(stored[0].weightBps, 6000);
        assertEq(stored[1].assetId, btc);
        assertEq(stored[1].weightBps, 4000);
    }

    function test_mint_incrementsTokenId() public {
        uint256 a = _mint(alice, _arr(_c(nvda, nvdaRep, 6000), _c(btc, btcRep, 4000)));
        uint256 b = _mint(bob, _arr(_c(aapl, aaplRep, 5000), _c(eth, ethRep, 5000)));
        assertEq(a, 1);
        assertEq(b, 2);
        assertEq(nffc.ownerOf(1), alice);
        assertEq(nffc.ownerOf(2), bob);
    }

    function test_mint_oneComponent() public {
        uint256 id = _mint(alice, _arr(_c(nvda, nvdaRep, BPS_TOTAL)));
        assertEq(nffc.getComposition(id).length, 1);
        assertEq(nffc.getSegment(id), STOCK_ONLY);
    }

    function test_mint_twentyComponents() public {
        uint256 id = _mint(alice, _cryptoComps(20));
        assertEq(nffc.getComposition(id).length, 20);
        assertEq(nffc.getSegment(id), CRYPTO_ONLY);
    }

    // --------------------------------------------------- invariants I1..I6 ---

    function test_mint_zeroComponents_reverts() public {
        INFFC.Component[] memory comps = new INFFC.Component[](0);
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(INFFC.InvalidComponentCount.selector, 0));
        nffc.mint(_params(0, comps));
    }

    function test_mint_twentyOneComponents_reverts() public {
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(INFFC.InvalidComponentCount.selector, 21));
        nffc.mint(_params(0, _cryptoComps(21)));
    }

    function test_mint_weightSumBelow_reverts() public {
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(INFFC.WeightSumNot10000.selector, 9999));
        nffc.mint(_params(0, _arr(_c(nvda, nvdaRep, 5999), _c(btc, btcRep, 4000))));
    }

    function test_mint_weightSumAbove_reverts() public {
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(INFFC.WeightSumNot10000.selector, 10001));
        nffc.mint(_params(0, _arr(_c(nvda, nvdaRep, 6001), _c(btc, btcRep, 4000))));
    }

    function test_mint_duplicateAsset_reverts() public {
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(INFFC.DuplicateAsset.selector, nvda));
        nffc.mint(_params(0, _arr(_c(nvda, nvdaRep, 5000), _c(nvda, nvdaRep, 5000))));
    }

    function test_mint_zeroWeight_reverts() public {
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(INFFC.ZeroWeight.selector, btc));
        nffc.mint(_params(0, _arr(_c(nvda, nvdaRep, BPS_TOTAL), _c(btc, btcRep, 0))));
    }

    function test_mint_unregisteredRepresentation_reverts() public {
        bytes32 ghost = bytes32("ghost");
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(INFFC.RepresentationNotActive.selector, ghost));
        nffc.mint(_params(0, _arr(_c(nvda, ghost, BPS_TOTAL))));
    }

    function test_mint_inactiveRepresentation_reverts() public {
        vm.prank(admin);
        reps.setRepresentationStatus(btcRep, IRepresentationRegistry.RepStatus.INACTIVE);

        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(INFFC.RepresentationNotActive.selector, btcRep));
        nffc.mint(_params(0, _arr(_c(nvda, nvdaRep, 6000), _c(btc, btcRep, 4000))));
    }

    function test_mint_representationAssetMismatch_reverts() public {
        // btcRep is ACTIVE but resolves to `btc`, not `nvda`
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(INFFC.RepresentationAssetMismatch.selector, btcRep, nvda));
        nffc.mint(_params(0, _arr(_c(nvda, btcRep, BPS_TOTAL))));
    }

    // ---------------------------------------------------------- segmentation ---

    function test_segment_allStock() public {
        uint256 id = _mint(alice, _arr(_c(nvda, nvdaRep, 5000), _c(aapl, aaplRep, 5000)));
        assertEq(nffc.getSegment(id), STOCK_ONLY);
    }

    function test_segment_allCrypto() public {
        uint256 id = _mint(alice, _arr(_c(btc, btcRep, 5000), _c(eth, ethRep, 5000)));
        assertEq(nffc.getSegment(id), CRYPTO_ONLY);
    }

    function test_segment_mixed() public {
        uint256 id = _mint(alice, _arr(_c(nvda, nvdaRep, 5000), _c(eth, ethRep, 5000)));
        assertEq(nffc.getSegment(id), MIXED);
    }

    // ------------------------------------------------------------ static rarity ---

    function test_getStaticRarity_matchesLibOverStoredWeights() public {
        uint256 id = _mint(alice, _arr(_c(nvda, nvdaRep, 9000), _c(btc, btcRep, 1000)));
        uint16[] memory w = new uint16[](2);
        (w[0], w[1]) = (9000, 1000);
        assertEq(nffc.getStaticRarity(id), StaticRarityLib.score(w));
    }

    function test_getStaticRarity_oneComponentIsMax() public {
        uint256 id = _mint(alice, _arr(_c(nvda, nvdaRep, BPS_TOTAL)));
        assertEq(nffc.getStaticRarity(id), 1e18);
    }

    function test_getStaticRarity_twentyEvenIsZero() public {
        uint256 id = _mint(alice, _cryptoComps(20));
        assertEq(nffc.getStaticRarity(id), 0);
    }

    function test_getStaticRarity_concentrationIsRarer() public {
        uint256 flat = _mint(alice, _arr(_c(nvda, nvdaRep, 5000), _c(btc, btcRep, 5000)));
        uint256 concentrated = _mint(bob, _arr(_c(aapl, aaplRep, 9500), _c(eth, ethRep, 500)));
        assertGt(nffc.getStaticRarity(concentrated), nffc.getStaticRarity(flat));
    }

    // --------------------------------------------------------- composition hash ---

    function test_compositionHash_matchesAbiEncode() public {
        INFFC.Component[] memory comps = _arr(_c(nvda, nvdaRep, 6000), _c(btc, btcRep, 4000));
        uint256 id = _mint(alice, comps);
        assertEq(nffc.getCompositionHash(id), keccak256(abi.encode(comps)));
    }

    function test_compositionHash_orderSensitive() public {
        uint256 a = _mint(alice, _arr(_c(nvda, nvdaRep, 6000), _c(btc, btcRep, 4000)));
        uint256 b = _mint(alice, _arr(_c(btc, btcRep, 4000), _c(nvda, nvdaRep, 6000)));
        assertTrue(nffc.getCompositionHash(a) != nffc.getCompositionHash(b));
    }

    // ------------------------------------------------------------ immutability ---

    function test_composition_survivesTransfer_andHasNoMutator() public {
        uint256 id = _mint(alice, _arr(_c(nvda, nvdaRep, 6000), _c(btc, btcRep, 4000)));
        bytes32 h = nffc.getCompositionHash(id);
        uint8 seg = nffc.getSegment(id);

        vm.prank(alice);
        nffc.transferFrom(alice, bob, id);

        assertEq(nffc.ownerOf(id), bob);
        assertEq(nffc.getCompositionHash(id), h);
        assertEq(nffc.getSegment(id), seg);
        assertEq(nffc.getComposition(id).length, 2);
        // I7: there is no setComposition / addComponent / reweight — a compile-time
        // guarantee. The ABI carries no such selector.
    }

    // ------------------------------------------------------------------ views ---

    function test_views_revertForUnknownToken() public {
        bytes memory err = abi.encodeWithSelector(IERC721Errors.ERC721NonexistentToken.selector, 999);
        vm.expectRevert(err);
        nffc.getComposition(999);
        vm.expectRevert(err);
        nffc.getCompositionHash(999);
        vm.expectRevert(err);
        nffc.getSegment(999);
        vm.expectRevert(err);
        nffc.getStaticRarity(999);
        vm.expectRevert(err);
        nffc.getCollectionId(999);
    }

    // -------------------------------------------------------------------- fee ---

    function test_mint_withValue_reverts() public {
        // fee is 0 by default (see setUp) — any nonzero msg.value is unmet.
        vm.deal(alice, 1 ether);
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(INFFC.MintFeeNotMet.selector, 1, 0));
        nffc.mint{value: 1}(_params(0, _arr(_c(nvda, nvdaRep, BPS_TOTAL))));
    }

    // -------------------------------------------------------------------- fees ---

    function test_quoteMintFee_matchesFeeConfig() public {
        fees.setCurve(0.01 ether, 0.005 ether);
        assertEq(nffc.quoteMintFee(3), fees.mintFee(3));
    }

    function test_mint_underpay_reverts() public {
        fees.setCurve(0.01 ether, 0.005 ether);
        uint256 fee = nffc.quoteMintFee(2);
        vm.deal(alice, fee);
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(INFFC.MintFeeNotMet.selector, fee - 1, fee));
        nffc.mint{value: fee - 1}(_params(0, _arr(_c(nvda, nvdaRep, 5000), _c(btc, btcRep, 5000))));
    }

    function test_mint_overpay_reverts() public {
        fees.setCurve(0.01 ether, 0.005 ether);
        uint256 fee = nffc.quoteMintFee(1);
        vm.deal(alice, fee + 1);
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(INFFC.MintFeeNotMet.selector, fee + 1, fee));
        nffc.mint{value: fee + 1}(_params(0, _arr(_c(nvda, nvdaRep, BPS_TOTAL))));
    }

    function test_mint_correctFee_forwardsToRecipient() public {
        fees.setCurve(0.01 ether, 0.005 ether);
        uint256 fee = nffc.quoteMintFee(1);
        vm.deal(alice, fee);
        uint256 before = treasury.balance;

        vm.prank(alice);
        nffc.mint{value: fee}(_params(0, _arr(_c(nvda, nvdaRep, BPS_TOTAL))));

        assertEq(treasury.balance, before + fee);
        assertEq(alice.balance, 0);
    }

    function test_mint_feeTransferFails_reverts() public {
        RejectEther sink = new RejectEther();
        fees.setFeeRecipient(address(sink));
        fees.setCurve(0.01 ether, 0.005 ether);

        uint256 fee = nffc.quoteMintFee(1);
        vm.deal(alice, fee);
        vm.prank(alice);
        vm.expectRevert(INFFC.FeeTransferFailed.selector);
        nffc.mint{value: fee}(_params(0, _arr(_c(nvda, nvdaRep, BPS_TOTAL))));
    }

    // --------------------------------------------------------------- pausing ---

    function test_pause_blocksMint() public {
        vm.prank(admin);
        nffc.pause();

        vm.prank(alice);
        vm.expectRevert(Pausable.EnforcedPause.selector);
        nffc.mint(_params(0, _arr(_c(nvda, nvdaRep, BPS_TOTAL))));
    }

    function test_unpause_restoresMint() public {
        vm.startPrank(admin);
        nffc.pause();
        nffc.unpause();
        vm.stopPrank();

        uint256 id = _mint(alice, _arr(_c(nvda, nvdaRep, BPS_TOTAL)));
        assertEq(nffc.ownerOf(id), alice);
    }

    function test_pause_onlyPauser() public {
        bytes32 role = nffc.PAUSER_ROLE();
        vm.prank(bob);
        vm.expectRevert(abi.encodeWithSelector(IAccessControl.AccessControlUnauthorizedAccount.selector, bob, role));
        nffc.pause();
    }

    // ----------------------------------------------------------- construction ---

    function test_constructor_rejectsZeroAdmin() public {
        vm.expectRevert(INFFC.ZeroAddress.selector);
        new NFFC(address(0), address(assets), address(reps), address(fees));
    }

    function test_constructor_rejectsZeroAssetRegistry() public {
        vm.expectRevert(INFFC.ZeroAddress.selector);
        new NFFC(admin, address(0), address(reps), address(fees));
    }

    function test_constructor_rejectsZeroRepresentationRegistry() public {
        vm.expectRevert(INFFC.ZeroAddress.selector);
        new NFFC(admin, address(assets), address(0), address(fees));
    }

    function test_constructor_rejectsZeroFeeConfig() public {
        vm.expectRevert(INFFC.ZeroAddress.selector);
        new NFFC(admin, address(assets), address(reps), address(0));
    }

    // ------------------------------------------------------------- ERC-721 ---

    function test_metadata_nameAndSymbol() public view {
        assertEq(nffc.name(), "Non-Fungible Financial Collectible");
        assertEq(nffc.symbol(), "NFFC");
    }

    function test_supportsInterface() public view {
        assertTrue(nffc.supportsInterface(0x80ac58cd)); // ERC721
        assertTrue(nffc.supportsInterface(0x5b5e139f)); // ERC721Metadata
        assertTrue(nffc.supportsInterface(0x7965db0b)); // IAccessControl
        assertTrue(nffc.supportsInterface(0x01ffc9a7)); // ERC165
        assertFalse(nffc.supportsInterface(0xffffffff));
    }

    // ------------------------------------------------------------------ fuzz ---

    function testFuzz_mint_twoComponentWeights(uint16 w1) public {
        w1 = uint16(bound(w1, 1, BPS_TOTAL - 1));
        uint16 w2 = BPS_TOTAL - w1;

        vm.prank(alice);
        uint256 id = nffc.mint(_params(0, _arr(_c(nvda, nvdaRep, w1), _c(btc, btcRep, w2))));

        assertEq(nffc.getSegment(id), MIXED);
        INFFC.Component[] memory stored = nffc.getComposition(id);
        assertEq(stored[0].weightBps, w1);
        assertEq(stored[1].weightBps, w2);
    }

    function testFuzz_mint_componentCount_allCrypto(uint256 k) public {
        k = bound(k, 1, 20);
        vm.prank(alice);
        uint256 id = nffc.mint(_params(0, _cryptoComps(k)));

        assertEq(nffc.getComposition(id).length, k);
        assertEq(nffc.getSegment(id), CRYPTO_ONLY);
    }
}
