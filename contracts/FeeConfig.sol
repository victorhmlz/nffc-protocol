// SPDX-License-Identifier: MIT
pragma solidity 0.8.34;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";

import {IFeeConfig} from "./interfaces/IFeeConfig.sol";
import {ICollection} from "./interfaces/ICollection.sol";

/**
 * FeeConfig — the single, centralized `IFeeConfig` implementation (TASK-30).
 * `docs/spec/06-fee-model.md` §4: "Changing any fee = one admin transaction to
 * `IFeeConfig`. No contract redeploy, no frontend deploy" — every fee this
 * protocol charges (collection creation, mint, marketplace, royalty) is a
 * value read from *this* contract at call time by `Collection.sol` (TASK-10),
 * `NFFC.sol` (TASK-09, wired in this same TASK), and `Marketplace.sol`
 * (TASK-19) — none of them hardcode an amount.
 *
 * **Curve form: affine, `base + slope * (n - 1)`** for both
 * `collectionCreationFee` and `mintFee` (`docs/spec/06-fee-model.md` §2's three
 * candidate forms). Chosen over a stepped table or piecewise curve because:
 * - It's monotonically non-decreasing *by construction* whenever `slope >= 0`
 *   — which is guaranteed structurally, since Solidity has no negative
 *   `uint256` — so there is no separate "is this table sorted" invariant to
 *   maintain or get wrong on an update, unlike a stepped table.
 *   `docs/spec/06-fee-model.md`'s own `MockFeeConfig` test double (already
 *   used by `Collection.t.sol` / `Marketplace.t.sol` since TASK-10/19) already
 *   assumed exactly this form — this contract matches it rather than
 *   introducing a second encoding nothing else expects.
 * - Two `uint256` words per curve is the cheapest possible non-decreasing,
 *   configurable curve to store and read — no `SLOAD` loop over a table.
 * - A piecewise curve's extra flexibility (a step-change at some threshold)
 *   isn't asked for by anything in the fee model spec, which only requires
 *   monotonic and bounded.
 *
 * **Hard caps** (`docs/spec/06-fee-model.md` §2: "so a misconfiguration cannot
 * brick minting") are `immutable`/`constant`, never admin-settable — a
 * compromised or fat-fingered `FEE_ADMIN_ROLE` transaction can misconfigure a
 * fee within these bounds, but can never exceed them:
 * - `MAX_CURVE_FEE_AT_MAX_N` bounds `base + slope * 19` (the curve's value at
 *   the maximum 20-component composition, `docs/spec/02-domain-model.md` I1)
 *   for both the collection-creation and mint curves.
 * - `MAX_MARKETPLACE_FEE_BPS` / `MAX_ROYALTY_BPS` bound the two basis-point
 *   fees.
 *
 * **Royalty requires an existing collection** (`setRoyaltyBps`) — resolves
 * `docs/OPEN_ISSUES.md`'s former Issue #3: `Marketplace._settle` calls
 * `Collection.ownerOfCollection(collectionId)` only when `royaltyBps != 0`;
 * if that royalty could only ever be set for a real `collectionId`, that call
 * can never revert with `UnknownCollection` in practice — the failure mode
 * Issue #3 flagged is closed here, not merely re-documented. This is exactly
 * why `NFFC_Development_Plan.md` TASK-30 already lists "Depende de: TASK-10"
 * (`Collection.sol`) — this contract is the reason.
 *
 * `collection` is deliberately **not** `immutable`, unlike every other
 * cross-contract reference in this codebase: `Collection.sol`'s own
 * constructor takes this contract's address (for the creation fee), so the
 * two cannot both be constructor-injected — one side of the cycle must be
 * wired after deployment. The deployment order is: (1) `FeeConfig` (with
 * `collection` unset), (2) `Collection` (passing this `FeeConfig`'s address),
 * (3) `FEE_ADMIN_ROLE` calls {setCollection} once, (4) `NFFC.sol` /
 * `Marketplace.sol`. Until step 3, {setRoyaltyBps} refuses every call — a
 * fail-closed default, not a silently-permissive one.
 *
 * `collectionCreationFee` / `mintFee` reject `componentCount == 0` or `> 20` —
 * the same `1..20` bound `NFFC.sol` (I1) and `Collection.sol` already enforce
 * elsewhere; a fee curve has no defined value outside that range.
 */
contract FeeConfig is IFeeConfig, AccessControl {
    bytes32 public constant FEE_ADMIN_ROLE = keccak256("FEE_ADMIN_ROLE");

    uint16 private constant MAX_COMPONENTS = 20;
    uint16 public constant MAX_MARKETPLACE_FEE_BPS = 1000; // 10%
    uint16 public constant MAX_ROYALTY_BPS = 1000; // 10%
    /// The curve's value at the maximum component count (`base + slope * 19`)
    /// may never exceed this, for either curve — a circuit breaker independent
    /// of whatever an admin configures.
    uint256 public constant MAX_CURVE_FEE_AT_MAX_N = 1 ether;

    error InvalidComponentCount(uint256 count);
    error UnknownCollection(uint256 collectionId);
    error ZeroAddress();

    event CollectionSet(address collection);

    /// Unset (`address(0)`) until {setCollection} is called — see this
    /// contract's header for why it can't be constructor-injected.
    ICollection public collection;

    struct Curve {
        uint256 base;
        uint256 slope;
    }

    Curve private _collectionFeeCurve;
    Curve private _mintFeeCurve;
    uint16 private _marketplaceFeeBps;
    address private _feeRecipient;
    mapping(uint256 collectionId => uint16) private _royaltyBps;

    constructor(
        address admin,
        uint256 collectionFeeBase,
        uint256 collectionFeeSlope,
        uint256 mintFeeBase,
        uint256 mintFeeSlope,
        uint16 marketplaceFeeBps_,
        address feeRecipient_
    ) {
        if (admin == address(0) || feeRecipient_ == address(0)) revert ZeroAddress();
        _requireWithinCurveCap(collectionFeeBase, collectionFeeSlope);
        _requireWithinCurveCap(mintFeeBase, mintFeeSlope);
        if (marketplaceFeeBps_ > MAX_MARKETPLACE_FEE_BPS) revert FeeOutOfBounds();

        _collectionFeeCurve = Curve(collectionFeeBase, collectionFeeSlope);
        _mintFeeCurve = Curve(mintFeeBase, mintFeeSlope);
        _marketplaceFeeBps = marketplaceFeeBps_;
        _feeRecipient = feeRecipient_;

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(FEE_ADMIN_ROLE, admin);
    }

    /// One-time-per-change wiring for the constructor cycle described above —
    /// `FEE_ADMIN_ROLE` only, callable again later if `Collection.sol` is ever
    /// redeployed.
    function setCollection(address collection_) external onlyRole(FEE_ADMIN_ROLE) {
        if (collection_ == address(0)) revert ZeroAddress();
        collection = ICollection(collection_);
        emit CollectionSet(collection_);
    }

    // ------------------------------------------------------------------ views ---

    /// @inheritdoc IFeeConfig
    function collectionCreationFee(uint16 componentCount) external view override returns (uint256) {
        return _curve(_collectionFeeCurve, componentCount);
    }

    /// @inheritdoc IFeeConfig
    function mintFee(uint16 componentCount) external view override returns (uint256) {
        return _curve(_mintFeeCurve, componentCount);
    }

    /// @inheritdoc IFeeConfig
    function marketplaceFeeBps() external view override returns (uint16) {
        return _marketplaceFeeBps;
    }

    /// @inheritdoc IFeeConfig
    function royaltyBps(uint256 collectionId) external view override returns (uint16) {
        return _royaltyBps[collectionId];
    }

    /// @inheritdoc IFeeConfig
    function feeRecipient() external view override returns (address) {
        return _feeRecipient;
    }

    function _curve(Curve storage c, uint16 n) private view returns (uint256) {
        if (n == 0 || n > MAX_COMPONENTS) revert InvalidComponentCount(n);
        return c.base + c.slope * (uint256(n) - 1);
    }

    function _requireWithinCurveCap(uint256 base, uint256 slope) private pure {
        // n = MAX_COMPONENTS is always the curve's maximum, since slope >= 0.
        if (base + slope * (MAX_COMPONENTS - 1) > MAX_CURVE_FEE_AT_MAX_N) revert FeeOutOfBounds();
    }

    // --------------------------------------------------------- FEE_ADMIN_ROLE ---

    /// @inheritdoc IFeeConfig
    /// @dev `params` is `abi.encode(uint256 base, uint256 slope)`.
    function setCollectionFeeParams(bytes calldata params) external override onlyRole(FEE_ADMIN_ROLE) {
        (uint256 base, uint256 slope) = abi.decode(params, (uint256, uint256));
        _requireWithinCurveCap(base, slope);
        _collectionFeeCurve = Curve(base, slope);
        emit CollectionFeeParamsChanged(params);
    }

    /// @inheritdoc IFeeConfig
    /// @dev `params` is `abi.encode(uint256 base, uint256 slope)`.
    function setMintFeeParams(bytes calldata params) external override onlyRole(FEE_ADMIN_ROLE) {
        (uint256 base, uint256 slope) = abi.decode(params, (uint256, uint256));
        _requireWithinCurveCap(base, slope);
        _mintFeeCurve = Curve(base, slope);
        emit MintFeeParamsChanged(params);
    }

    /// @inheritdoc IFeeConfig
    function setMarketplaceFeeBps(uint16 bps) external override onlyRole(FEE_ADMIN_ROLE) {
        if (bps > MAX_MARKETPLACE_FEE_BPS) revert FeeOutOfBounds();
        _marketplaceFeeBps = bps;
        emit MarketplaceFeeChanged(bps);
    }

    /// @inheritdoc IFeeConfig
    /// @dev Resolves `docs/OPEN_ISSUES.md` former Issue #3 — see this contract's
    ///      header. A royalty may only be set for a `collectionId` that
    ///      `Collection.sol` actually knows about.
    function setRoyaltyBps(uint256 collectionId, uint16 bps) external override onlyRole(FEE_ADMIN_ROLE) {
        if (bps > MAX_ROYALTY_BPS) revert FeeOutOfBounds();
        // `collection` unset (before the post-deploy wiring step) is treated
        // the same as "that collection doesn't exist" — fail closed, never
        // silently skip the check.
        if (address(collection) == address(0) || !collection.collectionExists(collectionId)) {
            revert UnknownCollection(collectionId);
        }
        _royaltyBps[collectionId] = bps;
        emit RoyaltyChanged(collectionId, bps);
    }

    /// @inheritdoc IFeeConfig
    function setFeeRecipient(address recipient) external override onlyRole(FEE_ADMIN_ROLE) {
        if (recipient == address(0)) revert ZeroAddress();
        _feeRecipient = recipient;
        emit FeeRecipientChanged(recipient);
    }
}
