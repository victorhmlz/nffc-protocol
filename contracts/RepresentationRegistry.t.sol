// SPDX-License-Identifier: MIT
pragma solidity 0.8.34;

import {Test} from "forge-std/Test.sol";
import {IAccessControl} from "@openzeppelin/contracts/access/IAccessControl.sol";
import {AssetIdentityRegistry} from "./AssetIdentityRegistry.sol";
import {RepresentationRegistry} from "./RepresentationRegistry.sol";
import {IAssetIdentityRegistry} from "./interfaces/IAssetIdentityRegistry.sol";
import {IRepresentationRegistry} from "./interfaces/IRepresentationRegistry.sol";
import {MockERC20} from "./mocks/MockERC20.sol";
import {NoMetadata} from "./mocks/NoMetadata.sol";

contract RepresentationRegistryTest is Test {
    AssetIdentityRegistry internal assets;
    RepresentationRegistry internal reps;

    address internal admin = makeAddr("admin");
    address internal robinhoodAdapter = makeAddr("robinhoodAdapter");
    address internal cryptoAdapter = makeAddr("cryptoAdapter");
    address internal stranger = makeAddr("stranger");

    bytes32 internal constant ROBINHOOD = bytes32("ROBINHOOD");
    bytes32 internal constant CRYPTO = bytes32("CRYPTO_NATIVE");
    bytes32 internal constant EQUITY = bytes32("EQUITY");
    bytes32 internal constant CRYPTO_CLASS = bytes32("CRYPTO");
    bytes32 internal constant ERC20 = bytes32("ERC20");
    uint256 internal constant CHAIN = 4663;

    bytes32 internal nvda;
    bytes32 internal btc;
    MockERC20 internal nvdaToken;
    MockERC20 internal wbtc;

    function setUp() public {
        assets = new AssetIdentityRegistry(admin);
        reps = new RepresentationRegistry(admin, address(assets));

        vm.startPrank(admin);
        nvda = assets.registerAssetIdentity("NVDA", "NVIDIA", EQUITY);
        btc = assets.registerAssetIdentity("BTC", "Bitcoin", CRYPTO_CLASS);
        reps.registerProvider(ROBINHOOD, robinhoodAdapter);
        reps.registerProvider(CRYPTO, cryptoAdapter);
        vm.stopPrank();

        nvdaToken = new MockERC20("Robinhood NVDA", "rNVDA", 18);
        wbtc = new MockERC20("Wrapped BTC", "WBTC", 8);
    }

    function _params(bytes32 assetId, bytes32 providerId, address token, uint8 decimals)
        internal
        pure
        returns (IRepresentationRegistry.RegisterParams memory)
    {
        return IRepresentationRegistry.RegisterParams({
            assetId: assetId,
            providerId: providerId,
            chainId: CHAIN,
            token: token,
            tokenStandard: ERC20,
            decimals: decimals,
            multiplier: 1e18,
            oracle: IRepresentationRegistry.OracleMetadata({feed: address(0xFEED), heartbeat: 3600, feedDecimals: 8})
        });
    }

    function _repId(bytes32 providerId, address token) internal pure returns (bytes32) {
        return keccak256(abi.encode(providerId, CHAIN, token));
    }

    // --------------------------------------------------------------- happy path

    function test_admin_registersRepresentation() public {
        vm.prank(admin);
        bytes32 id = reps.registerRepresentation(_params(nvda, ROBINHOOD, address(nvdaToken), 18));

        assertEq(id, _repId(ROBINHOOD, address(nvdaToken)));
        assertEq(id, reps.computeRepresentationId(ROBINHOOD, CHAIN, address(nvdaToken)));
        assertTrue(reps.isActiveRepresentation(id));
        assertTrue(reps.representationExists(id));
        assertTrue(reps.resolvesTo(id, nvda));
        assertFalse(reps.resolvesTo(id, btc));

        IRepresentationRegistry.Representation memory r = reps.getRepresentation(id);
        assertEq(r.assetId, nvda);
        assertEq(r.providerId, ROBINHOOD);
        assertEq(r.token, address(nvdaToken));
        assertEq(r.decimals, 18);
        assertEq(r.multiplier, 1e18);
        assertEq(uint8(r.status), uint8(IRepresentationRegistry.RepStatus.ACTIVE));

        bytes32[] memory byAsset = reps.getRepresentationsByAsset(nvda);
        assertEq(byAsset.length, 1);
        assertEq(byAsset[0], id);
    }

    function test_providerAdapter_canRegisterForOwnProvider() public {
        vm.prank(robinhoodAdapter);
        bytes32 id = reps.registerRepresentation(_params(nvda, ROBINHOOD, address(nvdaToken), 18));
        assertTrue(reps.isActiveRepresentation(id));
    }

    // ---------------- ACCEPTANCE: only verified, no arbitrary address ----------

    function test_stranger_cannotRegister() public {
        vm.prank(stranger);
        vm.expectRevert(
            abi.encodeWithSelector(IRepresentationRegistry.NotProviderAuthorized.selector, ROBINHOOD, stranger)
        );
        reps.registerRepresentation(_params(nvda, ROBINHOOD, address(nvdaToken), 18));
    }

    function test_adapter_cannotRegisterForOtherProvider() public {
        vm.prank(cryptoAdapter);
        vm.expectRevert(
            abi.encodeWithSelector(IRepresentationRegistry.NotProviderAuthorized.selector, ROBINHOOD, cryptoAdapter)
        );
        reps.registerRepresentation(_params(nvda, ROBINHOOD, address(nvdaToken), 18));
    }

    function test_nonContractToken_reverts() public {
        address eoa = makeAddr("eoa");
        vm.prank(admin);
        vm.expectRevert(abi.encodeWithSelector(IRepresentationRegistry.TokenNotAContract.selector, eoa));
        reps.registerRepresentation(_params(nvda, ROBINHOOD, eoa, 18));
    }

    function test_tokenWithoutDecimals_reverts() public {
        NoMetadata noMeta = new NoMetadata();
        vm.prank(admin);
        vm.expectRevert(
            abi.encodeWithSelector(IRepresentationRegistry.TokenMetadataUnavailable.selector, address(noMeta))
        );
        reps.registerRepresentation(_params(nvda, ROBINHOOD, address(noMeta), 18));
    }

    function test_decimalsMismatch_reverts() public {
        vm.prank(admin);
        vm.expectRevert(
            abi.encodeWithSelector(IRepresentationRegistry.DecimalsMismatch.selector, address(nvdaToken), uint8(6), uint8(18))
        );
        reps.registerRepresentation(_params(nvda, ROBINHOOD, address(nvdaToken), 6));
    }

    function test_inactiveAsset_reverts() public {
        vm.prank(admin);
        assets.setAssetStatus(nvda, IAssetIdentityRegistry.AssetStatus.INACTIVE);

        vm.prank(admin);
        vm.expectRevert(abi.encodeWithSelector(IRepresentationRegistry.AssetNotActive.selector, nvda));
        reps.registerRepresentation(_params(nvda, ROBINHOOD, address(nvdaToken), 18));
    }

    function test_unknownProvider_reverts() public {
        vm.prank(admin);
        vm.expectRevert(abi.encodeWithSelector(IRepresentationRegistry.UnknownProvider.selector, bytes32("NOPE")));
        reps.registerRepresentation(_params(nvda, bytes32("NOPE"), address(nvdaToken), 18));
    }

    function test_inactiveProvider_reverts() public {
        vm.prank(admin);
        reps.setProviderActive(ROBINHOOD, false);

        vm.prank(admin);
        vm.expectRevert(abi.encodeWithSelector(IRepresentationRegistry.ProviderInactive.selector, ROBINHOOD));
        reps.registerRepresentation(_params(nvda, ROBINHOOD, address(nvdaToken), 18));
    }

    function test_zeroMultiplier_reverts() public {
        IRepresentationRegistry.RegisterParams memory p = _params(nvda, ROBINHOOD, address(nvdaToken), 18);
        p.multiplier = 0;
        vm.prank(admin);
        vm.expectRevert(IRepresentationRegistry.ZeroMultiplier.selector);
        reps.registerRepresentation(p);
    }

    function test_duplicateRepresentation_reverts() public {
        vm.startPrank(admin);
        reps.registerRepresentation(_params(nvda, ROBINHOOD, address(nvdaToken), 18));
        vm.expectRevert(
            abi.encodeWithSelector(
                IRepresentationRegistry.RepresentationAlreadyExists.selector, _repId(ROBINHOOD, address(nvdaToken))
            )
        );
        reps.registerRepresentation(_params(nvda, ROBINHOOD, address(nvdaToken), 18));
        vm.stopPrank();
    }

    // ------------- ACCEPTANCE: multi-provider, no contract change -------------

    function test_secondProvider_worksWithoutContractChange() public {
        vm.startPrank(admin);
        bytes32 rh = reps.registerRepresentation(_params(nvda, ROBINHOOD, address(nvdaToken), 18));
        bytes32 cr = reps.registerRepresentation(_params(btc, CRYPTO, address(wbtc), 8));
        vm.stopPrank();

        assertTrue(reps.isActiveRepresentation(rh));
        assertTrue(reps.isActiveRepresentation(cr));
        assertTrue(reps.resolvesTo(cr, btc));

        IRepresentationRegistry.Representation memory r = reps.getRepresentation(cr);
        assertEq(r.providerId, CRYPTO);
        assertEq(r.decimals, 8);
        assertEq(r.token, address(wbtc));
    }

    // ------------------------------------------------------------- lifecycle ---

    function test_adapter_deactivates_adminReactivates() public {
        vm.prank(admin);
        bytes32 id = reps.registerRepresentation(_params(nvda, ROBINHOOD, address(nvdaToken), 18));

        vm.prank(robinhoodAdapter);
        reps.deactivateRepresentation(id);
        assertFalse(reps.isActiveRepresentation(id));
        assertTrue(reps.representationExists(id));

        vm.prank(admin);
        reps.setRepresentationStatus(id, IRepresentationRegistry.RepStatus.ACTIVE);
        assertTrue(reps.isActiveRepresentation(id));
    }

    function test_updateOracle_leavesIdentityFieldsIntact() public {
        vm.prank(admin);
        bytes32 id = reps.registerRepresentation(_params(nvda, ROBINHOOD, address(nvdaToken), 18));

        vm.prank(admin);
        reps.updateOracleMetadata(
            id, IRepresentationRegistry.OracleMetadata({feed: address(0xBEEF), heartbeat: 60, feedDecimals: 18})
        );

        IRepresentationRegistry.Representation memory r = reps.getRepresentation(id);
        assertEq(r.oracle.feed, address(0xBEEF));
        assertEq(r.oracle.heartbeat, uint32(60));
        assertEq(r.token, address(nvdaToken));
        assertEq(r.assetId, nvda);
        assertEq(r.decimals, 18);
        assertEq(r.multiplier, 1e18);
    }

    function test_setStatus_unknownRep_reverts() public {
        vm.prank(admin);
        vm.expectRevert(
            abi.encodeWithSelector(IRepresentationRegistry.UnknownRepresentation.selector, bytes32("nope"))
        );
        reps.setRepresentationStatus(bytes32("nope"), IRepresentationRegistry.RepStatus.INACTIVE);
    }

    // ------------------------------------------------------------- providers ---

    function test_registerProvider_onlyAdmin() public {
        vm.prank(stranger);
        vm.expectRevert(
            abi.encodeWithSelector(
                IAccessControl.AccessControlUnauthorizedAccount.selector, stranger, reps.REGISTRY_ADMIN_ROLE()
            )
        );
        reps.registerProvider(bytes32("X"), address(0));
    }

    function test_registerProvider_duplicate_reverts() public {
        vm.prank(admin);
        vm.expectRevert(abi.encodeWithSelector(IRepresentationRegistry.ProviderAlreadyExists.selector, ROBINHOOD));
        reps.registerProvider(ROBINHOOD, address(0));
    }

    function test_emptyProviderId_reverts() public {
        vm.prank(admin);
        vm.expectRevert(IRepresentationRegistry.EmptyProviderId.selector);
        reps.registerProvider(bytes32(0), address(0));
    }

    function test_constructor_rejectsZeroAdmin() public {
        vm.expectRevert(IRepresentationRegistry.ZeroAddress.selector);
        new RepresentationRegistry(address(0), address(assets));
    }

    function test_constructor_rejectsZeroAssetRegistry() public {
        vm.expectRevert(IRepresentationRegistry.ZeroAddress.selector);
        new RepresentationRegistry(admin, address(0));
    }
}
