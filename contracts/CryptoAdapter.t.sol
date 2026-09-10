// SPDX-License-Identifier: MIT
pragma solidity 0.8.34;

import {Test} from "forge-std/Test.sol";
import {IAccessControl} from "@openzeppelin/contracts/access/IAccessControl.sol";
import {AssetIdentityRegistry} from "./AssetIdentityRegistry.sol";
import {RepresentationRegistry} from "./RepresentationRegistry.sol";
import {CryptoAdapter} from "./CryptoAdapter.sol";
import {RobinhoodAdapter} from "./RobinhoodAdapter.sol";
import {IProviderAdapter} from "./interfaces/IProviderAdapter.sol";
import {IRepresentationRegistry} from "./interfaces/IRepresentationRegistry.sol";
import {MockERC20} from "./mocks/MockERC20.sol";

contract CryptoAdapterTest is Test {
    AssetIdentityRegistry internal assets;
    RepresentationRegistry internal reps;
    CryptoAdapter internal adapter;

    address internal admin = makeAddr("admin");
    address internal syncSigner = makeAddr("syncSigner");
    address internal stranger = makeAddr("stranger");

    uint256 internal constant CHAIN = 4663;
    bytes32 internal constant CRYPTO_NATIVE = bytes32("CRYPTO_NATIVE");
    bytes32 internal constant CRYPTO = bytes32("CRYPTO");

    MockERC20 internal wbtc; // 8 decimals, like real WBTC
    MockERC20 internal weth; // 18 decimals

    function setUp() public {
        assets = new AssetIdentityRegistry(admin);
        reps = new RepresentationRegistry(admin, address(assets));
        adapter = new CryptoAdapter(admin, syncSigner, address(assets), address(reps), CHAIN);

        vm.startPrank(admin);
        reps.registerProvider(CRYPTO_NATIVE, address(adapter));
        assets.grantRole(assets.REGISTRY_ADMIN_ROLE(), address(adapter));
        vm.stopPrank();

        wbtc = new MockERC20("Wrapped BTC", "WBTC", 8);
        weth = new MockERC20("Wrapped Ether", "WETH", 18);
    }

    function _entry(string memory symbol, string memory name, address token, uint8 decimals)
        internal
        pure
        returns (IProviderAdapter.SyncEntry memory)
    {
        return IProviderAdapter.SyncEntry({
            symbol: symbol,
            name: name,
            token: token,
            decimals: decimals,
            multiplier: 1e18,
            oracle: IRepresentationRegistry.OracleMetadata({feed: address(0xFEED), heartbeat: 3600, feedDecimals: 8})
        });
    }

    function test_identityConstants() public view {
        assertEq(adapter.providerId(), CRYPTO_NATIVE);
        assertEq(adapter.assetClass(), CRYPTO);
    }

    function test_syncUpsert_createsCryptoAssetAndRepresentation() public {
        vm.prank(syncSigner);
        bytes32 repId = adapter.syncUpsert(_entry("BTC", "Bitcoin", address(wbtc), 8));

        bytes32 assetId = assets.computeAssetId("BTC", CRYPTO);
        assertTrue(assets.isActiveAsset(assetId));

        IRepresentationRegistry.Representation memory r = reps.getRepresentation(repId);
        assertEq(r.providerId, CRYPTO_NATIVE);
        assertEq(r.token, address(wbtc));
        assertEq(r.decimals, 8);
        assertTrue(reps.resolvesTo(repId, assetId));
        assertEq(reps.getRepresentationsByProvider(CRYPTO_NATIVE).length, 1);
    }

    function test_syncUpsert_secondAsset() public {
        vm.startPrank(syncSigner);
        adapter.syncUpsert(_entry("BTC", "Bitcoin", address(wbtc), 8));
        adapter.syncUpsert(_entry("ETH", "Ether", address(weth), 18));
        vm.stopPrank();

        assertTrue(assets.assetExists(assets.computeAssetId("BTC", CRYPTO)));
        assertTrue(assets.assetExists(assets.computeAssetId("ETH", CRYPTO)));
        assertEq(reps.getRepresentationsByProvider(CRYPTO_NATIVE).length, 2);
    }

    function test_deactivate_thenReupsertReactivates() public {
        vm.prank(syncSigner);
        bytes32 repId = adapter.syncUpsert(_entry("BTC", "Bitcoin", address(wbtc), 8));
        vm.prank(syncSigner);
        adapter.syncDeactivateByToken(address(wbtc));
        assertFalse(reps.isActiveRepresentation(repId));
        vm.prank(syncSigner);
        adapter.syncUpsert(_entry("BTC", "Bitcoin", address(wbtc), 8));
        assertTrue(reps.isActiveRepresentation(repId));
        assertEq(reps.getRepresentationsByProvider(CRYPTO_NATIVE).length, 1);
    }

    function test_nonSync_cannotUpsert() public {
        bytes32 role = adapter.SYNC_ROLE();
        vm.prank(stranger);
        vm.expectRevert(
            abi.encodeWithSelector(IAccessControl.AccessControlUnauthorizedAccount.selector, stranger, role)
        );
        adapter.syncUpsert(_entry("BTC", "Bitcoin", address(wbtc), 8));
    }

    function test_wrongDecimals_reverts() public {
        // WBTC is 8; declaring 18 must be rejected by the registry's verification.
        vm.prank(syncSigner);
        vm.expectRevert(
            abi.encodeWithSelector(
                IRepresentationRegistry.DecimalsMismatch.selector, address(wbtc), uint8(18), uint8(8)
            )
        );
        adapter.syncUpsert(_entry("BTC", "Bitcoin", address(wbtc), 18));
    }

    /// Acceptance: Robinhood and Crypto adapters share one `RepresentationRegistry`,
    /// with no change to the registry. A mixed set coexists.
    function test_bothAdaptersShareOneRegistry() public {
        RobinhoodAdapter rh = new RobinhoodAdapter(admin, syncSigner, address(assets), address(reps), CHAIN);
        vm.startPrank(admin);
        reps.registerProvider(bytes32("ROBINHOOD"), address(rh));
        assets.grantRole(assets.REGISTRY_ADMIN_ROLE(), address(rh));
        vm.stopPrank();

        MockERC20 nvda = new MockERC20("Robinhood NVDA", "rNVDA", 18);

        vm.startPrank(syncSigner);
        bytes32 cryptoRep = adapter.syncUpsert(_entry("BTC", "Bitcoin", address(wbtc), 8));
        bytes32 equityRep = rh.syncUpsert(_entry("NVDA", "NVIDIA", address(nvda), 18));
        vm.stopPrank();

        assertTrue(reps.isActiveRepresentation(cryptoRep));
        assertTrue(reps.isActiveRepresentation(equityRep));
        assertEq(reps.getRepresentation(cryptoRep).providerId, CRYPTO_NATIVE);
        assertEq(reps.getRepresentation(equityRep).providerId, bytes32("ROBINHOOD"));
        assertEq(reps.getRepresentationsByProvider(CRYPTO_NATIVE).length, 1);
        assertEq(reps.getRepresentationsByProvider(bytes32("ROBINHOOD")).length, 1);
    }

    function test_constructor_rejectsZeroAdmin() public {
        vm.expectRevert(IProviderAdapter.ZeroAddress.selector);
        new CryptoAdapter(address(0), syncSigner, address(assets), address(reps), CHAIN);
    }
}
