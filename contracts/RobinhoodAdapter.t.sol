// SPDX-License-Identifier: MIT
pragma solidity 0.8.34;

import {Test} from "forge-std/Test.sol";
import {IAccessControl} from "@openzeppelin/contracts/access/IAccessControl.sol";
import {AssetIdentityRegistry} from "./AssetIdentityRegistry.sol";
import {RepresentationRegistry} from "./RepresentationRegistry.sol";
import {RobinhoodAdapter} from "./RobinhoodAdapter.sol";
import {IAssetIdentityRegistry} from "./interfaces/IAssetIdentityRegistry.sol";
import {IRepresentationRegistry} from "./interfaces/IRepresentationRegistry.sol";
import {MockERC20} from "./mocks/MockERC20.sol";

contract RobinhoodAdapterTest is Test {
    AssetIdentityRegistry internal assets;
    RepresentationRegistry internal reps;
    RobinhoodAdapter internal adapter;

    address internal admin = makeAddr("admin");
    address internal syncSigner = makeAddr("syncSigner");
    address internal stranger = makeAddr("stranger");

    uint256 internal constant CHAIN = 4663;
    bytes32 internal constant ROBINHOOD = bytes32("ROBINHOOD");
    bytes32 internal constant EQUITY = bytes32("EQUITY");

    MockERC20 internal nvdaToken;
    MockERC20 internal msftToken;

    event RepresentationSynced(
        bytes32 indexed representationId, address indexed token, string symbol, bool created
    );

    function setUp() public {
        assets = new AssetIdentityRegistry(admin);
        reps = new RepresentationRegistry(admin, address(assets));
        adapter = new RobinhoodAdapter(admin, syncSigner, address(assets), address(reps), CHAIN);

        vm.startPrank(admin);
        reps.registerProvider(ROBINHOOD, address(adapter));
        assets.grantRole(assets.REGISTRY_ADMIN_ROLE(), address(adapter));
        vm.stopPrank();

        nvdaToken = new MockERC20("Robinhood NVDA", "rNVDA", 18);
        msftToken = new MockERC20("Robinhood MSFT", "rMSFT", 18);
    }

    function _oracle() internal pure returns (IRepresentationRegistry.OracleMetadata memory) {
        return IRepresentationRegistry.OracleMetadata({feed: address(0xFEED), heartbeat: 3600, feedDecimals: 8});
    }

    function _entry(string memory symbol, string memory name, address token)
        internal
        pure
        returns (RobinhoodAdapter.SyncEntry memory)
    {
        return RobinhoodAdapter.SyncEntry({
            symbol: symbol,
            name: name,
            token: token,
            decimals: 18,
            multiplier: 1e18,
            oracle: _oracle()
        });
    }

    function test_providerId() public view {
        assertEq(adapter.providerId(), ROBINHOOD);
    }

    function test_constructor_rejectsZeroAdmin() public {
        vm.expectRevert(RobinhoodAdapter.ZeroAddress.selector);
        new RobinhoodAdapter(address(0), syncSigner, address(assets), address(reps), CHAIN);
    }

    function test_constructor_rejectsZeroAssetRegistry() public {
        vm.expectRevert(RobinhoodAdapter.ZeroAddress.selector);
        new RobinhoodAdapter(admin, syncSigner, address(0), address(reps), CHAIN);
    }

    function test_constructor_rejectsZeroRepresentationRegistry() public {
        vm.expectRevert(RobinhoodAdapter.ZeroAddress.selector);
        new RobinhoodAdapter(admin, syncSigner, address(assets), address(0), CHAIN);
    }

    function test_syncUpsert_new_createsAssetAndRepresentation() public {
        vm.prank(syncSigner);
        bytes32 repId = adapter.syncUpsert(_entry("NVDA", "NVIDIA", address(nvdaToken)));

        bytes32 assetId = assets.computeAssetId("NVDA", EQUITY);
        assertTrue(assets.assetExists(assetId));
        assertTrue(assets.isActiveAsset(assetId));

        assertEq(repId, reps.computeRepresentationId(ROBINHOOD, CHAIN, address(nvdaToken)));
        assertTrue(reps.isActiveRepresentation(repId));
        assertTrue(reps.resolvesTo(repId, assetId));

        IRepresentationRegistry.Representation memory r = reps.getRepresentation(repId);
        assertEq(r.providerId, ROBINHOOD);
        assertEq(r.token, address(nvdaToken));
        assertEq(r.decimals, 18);
        assertEq(r.multiplier, 1e18);
        assertEq(r.tokenStandard, bytes32("ERC20"));
        assertEq(r.oracle.feed, address(0xFEED));

        assertEq(reps.getRepresentationsByProvider(ROBINHOOD).length, 1);
    }

    function test_syncUpsert_emitsCreatedEvent() public {
        bytes32 repId = reps.computeRepresentationId(ROBINHOOD, CHAIN, address(nvdaToken));
        vm.expectEmit(true, true, false, true, address(adapter));
        emit RepresentationSynced(repId, address(nvdaToken), "NVDA", true);
        vm.prank(syncSigner);
        adapter.syncUpsert(_entry("NVDA", "NVIDIA", address(nvdaToken)));
    }

    function test_syncUpsert_secondSymbol_createsSecondAsset() public {
        vm.startPrank(syncSigner);
        adapter.syncUpsert(_entry("NVDA", "NVIDIA", address(nvdaToken)));
        adapter.syncUpsert(_entry("MSFT", "Microsoft", address(msftToken)));
        vm.stopPrank();

        assertTrue(assets.assetExists(assets.computeAssetId("NVDA", EQUITY)));
        assertTrue(assets.assetExists(assets.computeAssetId("MSFT", EQUITY)));
        assertEq(reps.getRepresentationsByProvider(ROBINHOOD).length, 2);
    }

    function test_syncUpsert_existing_updatesOracleAndReactivates() public {
        vm.prank(syncSigner);
        bytes32 repId = adapter.syncUpsert(_entry("NVDA", "NVIDIA", address(nvdaToken)));

        // Robinhood delists → worker deactivates
        vm.prank(syncSigner);
        adapter.syncDeactivateByToken(address(nvdaToken));
        assertFalse(reps.isActiveRepresentation(repId));

        // Robinhood re-lists with fresh oracle metadata → worker upserts again
        RobinhoodAdapter.SyncEntry memory e = _entry("NVDA", "NVIDIA", address(nvdaToken));
        e.oracle = IRepresentationRegistry.OracleMetadata({feed: address(0xBEEF), heartbeat: 120, feedDecimals: 18});
        vm.prank(syncSigner);
        bytes32 repId2 = adapter.syncUpsert(e);

        assertEq(repId2, repId);
        assertTrue(reps.isActiveRepresentation(repId));
        assertEq(reps.getRepresentation(repId).oracle.feed, address(0xBEEF));
        assertEq(reps.getRepresentation(repId).oracle.heartbeat, uint32(120));
        assertEq(reps.getRepresentationsByProvider(ROBINHOOD).length, 1); // no duplicate
    }

    function test_syncDeactivate_byId() public {
        vm.prank(syncSigner);
        bytes32 repId = adapter.syncUpsert(_entry("NVDA", "NVIDIA", address(nvdaToken)));
        vm.prank(syncSigner);
        adapter.syncDeactivate(repId);
        assertFalse(reps.isActiveRepresentation(repId));
        assertTrue(reps.representationExists(repId));
    }

    function test_nonSync_cannotUpsert() public {
        bytes32 role = adapter.SYNC_ROLE();
        vm.prank(stranger);
        vm.expectRevert(
            abi.encodeWithSelector(IAccessControl.AccessControlUnauthorizedAccount.selector, stranger, role)
        );
        adapter.syncUpsert(_entry("NVDA", "NVIDIA", address(nvdaToken)));
    }

    function test_nonSync_cannotDeactivate() public {
        vm.prank(syncSigner);
        bytes32 repId = adapter.syncUpsert(_entry("NVDA", "NVIDIA", address(nvdaToken)));
        bytes32 role = adapter.SYNC_ROLE();
        vm.prank(stranger);
        vm.expectRevert(
            abi.encodeWithSelector(IAccessControl.AccessControlUnauthorizedAccount.selector, stranger, role)
        );
        adapter.syncDeactivate(repId);
    }

    function test_syncUpsert_isIdempotentOnNoChange() public {
        vm.startPrank(syncSigner);
        bytes32 a = adapter.syncUpsert(_entry("NVDA", "NVIDIA", address(nvdaToken)));
        bytes32 b = adapter.syncUpsert(_entry("NVDA", "NVIDIA", address(nvdaToken)));
        vm.stopPrank();
        assertEq(a, b);
        assertTrue(reps.isActiveRepresentation(a));
        assertEq(reps.getRepresentationsByProvider(ROBINHOOD).length, 1);
    }
}
