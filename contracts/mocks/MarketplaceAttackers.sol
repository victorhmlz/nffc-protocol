// SPDX-License-Identifier: MIT
pragma solidity 0.8.34;

import {IERC721Receiver} from "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";

/**
 * Test doubles for `Marketplace.t.sol`'s reentrancy suite (TASK-19 acceptance:
 * "Reentrancy protection on every value-moving path, verified by dedicated tests").
 *
 * `ReenterOnReceiveMarketplace` is a generic attacker: `execute` lets a test drive
 * it through arbitrary setup calls (own a token, approve the marketplace, list
 * itself as seller, become a fee/royalty recipient, ...) exactly as a real
 * attacker-controlled contract would, and `arm` + `receive` re-enters the
 * marketplace with an arbitrary encoded call the moment it is paid — mirroring
 * `Collection.t.sol`'s `ReenterOnReceive`, generalized to Marketplace's three
 * value-moving paths (`buy`, `acceptOffer`, `cancelOffer`) instead of one.
 */
contract ReenterOnReceiveMarketplace is IERC721Receiver {
    address public immutable owner;
    bool private _armed;
    address private _reentryTarget;
    bytes private _reentryCall;
    uint256 private _reentryValue;

    constructor() {
        owner = msg.sender;
    }

    /// Arbitrary setup call, restricted to the deployer (the test contract) so it
    /// can only ever be driven by trusted test code, never by a third party.
    function execute(address target, bytes calldata data, uint256 value) external payable returns (bytes memory) {
        require(msg.sender == owner, "not owner");
        (bool ok, bytes memory ret) = target.call{value: value}(data);
        require(ok, "execute failed");
        return ret;
    }

    /// Arms a single reentrant call, fired the next time this contract is paid.
    /// `value` is forwarded from this contract's own balance (pre-funded by the
    /// test via `vm.deal`, plus whatever it was just paid) — so the reentrant
    /// call can satisfy the target function's own preconditions (e.g. an exact
    /// price match) and actually reach the `nonReentrant` guard, rather than
    /// failing earlier for an unrelated reason.
    function arm(address target, bytes calldata reentryCall, uint256 value) external {
        require(msg.sender == owner, "not owner");
        _armed = true;
        _reentryTarget = target;
        _reentryCall = reentryCall;
        _reentryValue = value;
    }

    /// Overload for reentrant calls that take no value (e.g. `cancelOffer`).
    function arm(address target, bytes calldata reentryCall) external {
        require(msg.sender == owner, "not owner");
        _armed = true;
        _reentryTarget = target;
        _reentryCall = reentryCall;
        _reentryValue = 0;
    }

    /// Accepts any NFFC minted/transferred to this contract via `safeTransferFrom`
    /// (`NFFC.mint` uses `_safeMint`; `Marketplace._settle` uses `safeTransferFrom`
    /// per S12) — without this, moving a token to an attacker contract (to test it
    /// as a seller, or as the buyer receiving the NFT itself) reverts with
    /// `ERC721InvalidReceiver` before the reentrancy scenario is even set up. If
    /// armed, also attempts the reentrant call from inside the hook — proving the
    /// guard blocks reentrancy attempted *during* the NFT transfer itself, not
    /// only from a later fee/proceeds payout.
    function onERC721Received(address, address, uint256, bytes calldata) external override returns (bytes4) {
        _maybeReenter();
        return IERC721Receiver.onERC721Received.selector;
    }

    receive() external payable {
        _maybeReenter();
    }

    function _maybeReenter() private {
        if (!_armed) return;
        _armed = false;
        // The reentrant call is expected to revert (blocked by `nonReentrant`).
        // Bubble that revert instead of swallowing it, so the caller (`receive()`
        // or `onERC721Received`) itself reverts — exactly like `Collection.t.sol`'s
        // `ReenterOnReceive`, which is what makes the marketplace's own call that
        // triggered this hook come back failed (a low-level `.call` returning
        // `ok == false`, surfacing as `FeeTransferFailed`; or a reverted
        // `safeTransferFrom`).
        (bool ok, bytes memory ret) = _reentryTarget.call{value: _reentryValue}(_reentryCall);
        if (!ok) {
            assembly {
                revert(add(ret, 32), mload(ret))
            }
        }
    }
}
