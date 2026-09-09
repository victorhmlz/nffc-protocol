// SPDX-License-Identifier: MIT
pragma solidity 0.8.34;

import {Test} from "forge-std/Test.sol";
import {IAccessControl} from "@openzeppelin/contracts/access/IAccessControl.sol";
import {AssetIdentityRegistry} from "./AssetIdentityRegistry.sol";
import {IAssetIdentityRegistry} from "./interfaces/IAssetIdentityRegistry.sol";

contract AssetIdentityRegistryTest is Test {
    AssetIdentityRegistry internal registry;

    address internal admin = makeAddr("admin");
    address internal stranger = makeAddr("stranger");
    bytes32 internal constant EQUITY = bytes32("EQUITY");

    event AssetIdentityRegistered(bytes32 indexed assetId, string symbol, bytes32 indexed assetClass);

    function setUp() public {
        registry = new AssetIdentityRegistry(admin);
    }

    function _id(string memory symbol) internal pure returns (bytes32) {
        return keccak256(abi.encode(EQUITY, symbol));
    }

    function test_constructor_rejectsZeroAdmin() public {
        vm.expectRevert(IAssetIdentityRegistry.ZeroAddress.selector);
        new AssetIdentityRegistry(address(0));
    }

    function test_constructor_grantsRolesToAdmin() public view {
        assertTrue(registry.hasRole(registry.DEFAULT_ADMIN_ROLE(), admin));
        assertTrue(registry.hasRole(registry.REGISTRY_ADMIN_ROLE(), admin));
    }

    function test_admin_registers_activeByDefault() public {
        vm.prank(admin);
        bytes32 id = registry.registerAssetIdentity("NVDA", "NVIDIA", EQUITY);

        assertEq(id, _id("NVDA"));
        assertTrue(registry.isActiveAsset(id));
        assertTrue(registry.assetExists(id));

        IAssetIdentityRegistry.AssetIdentity memory a = registry.getAssetIdentity(id);
        assertEq(a.symbol, "NVDA");
        assertEq(a.name, "NVIDIA");
        assertEq(a.assetClass, EQUITY);
        assertEq(uint8(a.status), uint8(IAssetIdentityRegistry.AssetStatus.ACTIVE));
    }

    function test_register_emitsEvent() public {
        vm.expectEmit(true, true, false, true, address(registry));
        emit AssetIdentityRegistered(_id("NVDA"), "NVDA", EQUITY);
        vm.prank(admin);
        registry.registerAssetIdentity("NVDA", "NVIDIA", EQUITY);
    }

    function test_nonAdmin_cannotRegister() public {
        bytes32 role = registry.REGISTRY_ADMIN_ROLE();
        vm.prank(stranger);
        vm.expectRevert(
            abi.encodeWithSelector(IAccessControl.AccessControlUnauthorizedAccount.selector, stranger, role)
        );
        registry.registerAssetIdentity("NVDA", "NVIDIA", EQUITY);
    }

    function test_duplicate_reverts() public {
        vm.startPrank(admin);
        registry.registerAssetIdentity("NVDA", "NVIDIA", EQUITY);
        vm.expectRevert(abi.encodeWithSelector(IAssetIdentityRegistry.AssetAlreadyExists.selector, _id("NVDA")));
        registry.registerAssetIdentity("NVDA", "different name", EQUITY);
        vm.stopPrank();
    }

    function test_emptySymbol_reverts() public {
        vm.prank(admin);
        vm.expectRevert(IAssetIdentityRegistry.EmptySymbol.selector);
        registry.registerAssetIdentity("", "x", EQUITY);
    }

    function test_emptyAssetClass_reverts() public {
        vm.prank(admin);
        vm.expectRevert(IAssetIdentityRegistry.EmptyAssetClass.selector);
        registry.registerAssetIdentity("NVDA", "x", bytes32(0));
    }

    function test_setStatus_deactivates() public {
        vm.startPrank(admin);
        bytes32 id = registry.registerAssetIdentity("NVDA", "NVIDIA", EQUITY);
        registry.setAssetStatus(id, IAssetIdentityRegistry.AssetStatus.INACTIVE);
        vm.stopPrank();

        assertFalse(registry.isActiveAsset(id));
        assertTrue(registry.assetExists(id));
    }

    function test_setStatus_unknown_reverts() public {
        vm.prank(admin);
        vm.expectRevert(abi.encodeWithSelector(IAssetIdentityRegistry.UnknownAsset.selector, bytes32("nope")));
        registry.setAssetStatus(bytes32("nope"), IAssetIdentityRegistry.AssetStatus.INACTIVE);
    }

    function test_nonAdmin_cannotSetStatus() public {
        vm.prank(admin);
        bytes32 id = registry.registerAssetIdentity("NVDA", "NVIDIA", EQUITY);
        vm.prank(stranger);
        vm.expectRevert();
        registry.setAssetStatus(id, IAssetIdentityRegistry.AssetStatus.INACTIVE);
    }

    function test_getUnknown_reverts() public {
        vm.expectRevert(abi.encodeWithSelector(IAssetIdentityRegistry.UnknownAsset.selector, bytes32("nope")));
        registry.getAssetIdentity(bytes32("nope"));
    }

    function testFuzz_computeId_isDeterministic(string calldata symbol, bytes32 assetClass) public view {
        assertEq(registry.computeAssetId(symbol, assetClass), keccak256(abi.encode(assetClass, symbol)));
    }

    function test_computeId_matchesRegistered() public {
        vm.prank(admin);
        bytes32 id = registry.registerAssetIdentity("NVDA", "NVIDIA", EQUITY);
        assertEq(id, registry.computeAssetId("NVDA", EQUITY));
    }
}
