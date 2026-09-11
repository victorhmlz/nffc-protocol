// SPDX-License-Identifier: MIT
pragma solidity 0.8.34;

import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

import {IMarketplace} from "./interfaces/IMarketplace.sol";
import {INFFC} from "./interfaces/INFFC.sol";
import {ICollection} from "./interfaces/ICollection.sol";
import {IFeeConfig} from "./interfaces/IFeeConfig.sol";

/**
 * Marketplace — list, cancel, buy, offer (TASK-19).
 *
 * List/buy is escrow-free: a listing only records intent (seller, price); the NFT
 * itself stays with the seller (approved to this contract) until {buy} moves it and
 * settles funds in the same transaction. Offers are the one place this contract
 * holds a balance — {createOffer} escrows `msg.value`, refunded on {cancelOffer} or
 * paid out (split) on {acceptOffer}.
 *
 * Every value-moving path ({buy}, {acceptOffer}, {cancelOffer}) is `nonReentrant`
 * and follows checks-effects-interactions: state (`active` flags) flips before any
 * external call, so a reentrant call sees the listing/offer already closed
 * (`docs/spec/08-security-principles.md` S5, TASK-19 acceptance). {createListing}
 * and {cancelListing} touch no balance and need no guard.
 *
 * Fee and royalty are read from `IFeeConfig` at settlement time — never hardcoded —
 * and both are deducted from the sale price (paid by the seller from proceeds),
 * matching `docs/spec/06-fee-model.md` §1's "Creator Royalty: paid by seller, from
 * proceeds". Whether the marketplace fee should instead be split with the buyer is
 * explicitly left `// OPEN` in that spec, a TASK-30 decision — TASK-19's provisional
 * choice (buyer pays exactly the listing/offer price, fee+royalty come out of the
 * seller's proceeds) keeps `buy`/`acceptOffer` single-amount and simple to preview
 * in the UI; revisiting it is TASK-30 scope, not a `Marketplace.sol` change.
 *
 * V1 enforces royalties on this native marketplace (`docs/spec/06-fee-model.md` §3's
 * TASK-19 decision) — external venues are not assumed to honor them. The royalty
 * recipient is the collection's creator (`ICollection.ownerOfCollection`), resolved
 * only when `royaltyBps(collectionId) != 0`, so a token whose `collectionId` (an
 * unvalidated field on `NFFC.sol`, per TASK-09) does not correspond to a real,
 * existing `Collection` only reverts if that collection ever had a nonzero royalty
 * configured — never under the V1 default. See `docs/OPEN_ISSUES.md` Issue #3.
 *
 * Uses `IERC721.safeTransferFrom` — `docs/spec/08-security-principles.md` S12
 * requires NFFC transfers to follow ERC-721 safe-transfer semantics. The receiver
 * hook it calls on a contract buyer is one more callback inside the same
 * `nonReentrant`-guarded call, so it adds no exploitable surface beyond what
 * {buy}/{acceptOffer}'s fee/royalty/proceeds payouts already require the guard to
 * cover — proven together by the reentrancy tests.
 */
contract Marketplace is IMarketplace, AccessControl, Pausable, ReentrancyGuard {
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    uint16 private constant BPS_TOTAL = 10_000;

    IERC721 public immutable nffcToken;
    INFFC public immutable nffc;
    ICollection public immutable collection;
    IFeeConfig public immutable feeConfig;

    uint256 private _nextOfferId = 1;

    mapping(uint256 tokenId => Listing) private _listings;
    mapping(uint256 offerId => Offer) private _offers;

    error ZeroAddress();
    error NotOfferBuyer(uint256 offerId, address caller);
    error FeeTransferFailed();

    constructor(address admin, address nffc_, address collection_, address feeConfig_) {
        if (admin == address(0) || nffc_ == address(0) || collection_ == address(0) || feeConfig_ == address(0)) {
            revert ZeroAddress();
        }
        nffcToken = IERC721(nffc_);
        nffc = INFFC(nffc_);
        collection = ICollection(collection_);
        feeConfig = IFeeConfig(feeConfig_);
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(PAUSER_ROLE, admin);
    }

    // -------------------------------------------------------------- listings ---

    /// @inheritdoc IMarketplace
    function createListing(uint256 tokenId, uint256 price) external override whenNotPaused {
        address owner = nffcToken.ownerOf(tokenId); // reverts if the token doesn't exist
        if (owner != msg.sender) revert NotTokenOwner(tokenId, msg.sender);
        _listings[tokenId] =
            Listing({tokenId: tokenId, seller: msg.sender, price: price, createdAt: uint64(block.timestamp), active: true});
        emit ListingCreated(tokenId, msg.sender, price);
    }

    /// @inheritdoc IMarketplace
    /// @dev Deliberately not `whenNotPaused` — a pause stops new listings/offers/
    ///      sales, never a seller's ability to withdraw one already open.
    function cancelListing(uint256 tokenId) external override {
        Listing storage l = _listings[tokenId];
        if (!l.active) revert ListingNotActive(tokenId);
        if (l.seller != msg.sender) revert CannotCancelOthersListing();
        l.active = false;
        emit ListingCancelled(tokenId, msg.sender);
    }

    /// @inheritdoc IMarketplace
    /// @dev Any other active offers on `tokenId` are left untouched — the token's
    ///      new owner isn't bound by them, and each is still cancellable by its own
    ///      buyer for a full refund at any time; nothing here can strand funds.
    function buy(uint256 tokenId) external payable override nonReentrant whenNotPaused {
        Listing storage l = _listings[tokenId];
        if (!l.active) revert ListingNotActive(tokenId);
        if (msg.value != l.price) revert PriceMismatch(msg.value, l.price);
        address seller = l.seller;
        uint256 price = l.price;

        // effects — close the listing before any external call.
        l.active = false;
        if (nffcToken.ownerOf(tokenId) != seller) revert ListingNotActive(tokenId); // stale: sold/transferred elsewhere

        _settle(tokenId, seller, msg.sender, price);
    }

    // ----------------------------------------------------------------- offers ---

    /// @inheritdoc IMarketplace
    function createOffer(uint256 tokenId, uint64 expiry)
        external
        payable
        override
        whenNotPaused
        returns (uint256 offerId)
    {
        offerId = _nextOfferId++;
        _offers[offerId] =
            Offer({offerId: offerId, tokenId: tokenId, buyer: msg.sender, price: msg.value, expiry: expiry, active: true});
        emit OfferCreated(offerId, tokenId, msg.sender, msg.value, expiry);
    }

    /// @inheritdoc IMarketplace
    /// @dev Deliberately not `whenNotPaused`, same reasoning as {cancelListing} —
    ///      a buyer can always recover escrowed funds.
    function cancelOffer(uint256 offerId) external override nonReentrant {
        Offer storage o = _offers[offerId];
        if (!o.active) revert OfferNotActive(offerId);
        if (o.buyer != msg.sender) revert NotOfferBuyer(offerId, msg.sender);
        uint256 refund = o.price;
        address buyer = o.buyer;

        // effects — close the offer before refunding.
        o.active = false;

        emit OfferCancelled(offerId);
        if (refund != 0) {
            (bool ok,) = buyer.call{value: refund}("");
            if (!ok) revert FeeTransferFailed();
        }
    }

    /// @inheritdoc IMarketplace
    function acceptOffer(uint256 offerId) external override nonReentrant whenNotPaused {
        Offer storage o = _offers[offerId];
        if (!o.active) revert OfferNotActive(offerId);
        if (block.timestamp > o.expiry) revert OfferExpired(offerId, o.expiry); // strict — TASK-29 acceptance
        uint256 tokenId = o.tokenId;
        address seller = nffcToken.ownerOf(tokenId);
        if (seller != msg.sender) revert NotTokenOwner(tokenId, msg.sender);
        address buyer = o.buyer;
        uint256 price = o.price;

        // effects — close the offer (and any stale listing on the same token)
        // before any external call.
        o.active = false;
        if (_listings[tokenId].active) {
            _listings[tokenId].active = false;
            emit ListingCancelled(tokenId, seller);
        }

        _settle(tokenId, seller, buyer, price);
        emit OfferAccepted(offerId, tokenId, seller, buyer, price);
    }

    // ----------------------------------------------------------------- views ---

    function getListing(uint256 tokenId) external view returns (Listing memory) {
        return _listings[tokenId];
    }

    function getOffer(uint256 offerId) external view returns (Offer memory) {
        return _offers[offerId];
    }

    // --------------------------------------------------------------- pausing ---

    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    // --------------------------------------------------------------- internal ---

    /// Transfers the token and splits `price` into marketplace fee, creator
    /// royalty, and seller proceeds — all three amounts derived from `IFeeConfig`
    /// at call time, so a fee-parameter change never requires a redeploy here. The
    /// NFT moves first (an external call, but the funds it could theoretically be
    /// used to re-enter with belong to the guard already held by the caller);
    /// payouts follow, each an independent `.call` so one recipient's failure
    /// (e.g. `RejectEther`) reverts the whole settlement rather than silently
    /// dropping funds.
    function _settle(uint256 tokenId, address seller, address buyer, uint256 price) private {
        uint16 feeBps = feeConfig.marketplaceFeeBps();
        uint256 fee = (price * feeBps) / BPS_TOTAL;

        uint256 collectionId = nffc.getCollectionId(tokenId);
        uint16 royBps = feeConfig.royaltyBps(collectionId);
        uint256 royalty = (price * royBps) / BPS_TOTAL;

        uint256 sellerProceeds = price - fee - royalty; // reverts on underflow if fee+royalty > price

        nffcToken.safeTransferFrom(seller, buyer, tokenId);

        if (fee != 0) {
            (bool ok,) = feeConfig.feeRecipient().call{value: fee}("");
            if (!ok) revert FeeTransferFailed();
        }
        if (royalty != 0) {
            address creator = collection.ownerOfCollection(collectionId);
            (bool ok,) = creator.call{value: royalty}("");
            if (!ok) revert FeeTransferFailed();
        }
        if (sellerProceeds != 0) {
            (bool ok,) = seller.call{value: sellerProceeds}("");
            if (!ok) revert FeeTransferFailed();
        }

        emit Sale(tokenId, seller, buyer, price, fee, royalty);
    }
}
