// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * Marketplace — list, cancel, buy, offer (docs/spec/02-domain-model.md,
 * docs/spec/04-contract-interfaces.md §6). Fixes the exact surface from that spec;
 * the concrete contract (`Marketplace.sol`, TASK-19) also uses `ReentrancyGuard`,
 * `Pausable`, and `AccessControl` (for pausing), and adds a small number of
 * additional errors the spec's minimal list didn't enumerate (`ZeroAddress`,
 * `NotOfferBuyer`, `FeeTransferFailed`) — see `Marketplace.sol`'s header.
 */
interface IMarketplace {
    struct Listing {
        uint256 tokenId;
        address seller;
        uint256 price; // chain native (ETH); a quote token is `// OPEN` (06-fee-model.md)
        uint64 createdAt;
        bool active;
    }

    struct Offer {
        uint256 offerId;
        uint256 tokenId;
        address buyer;
        uint256 price; // escrowed in this contract until accepted or cancelled
        uint64 expiry; // unix seconds; strictly enforced on-chain (TASK-29 acceptance)
        bool active;
    }

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

    error NotTokenOwner(uint256 tokenId, address caller);
    error ListingNotActive(uint256 tokenId);
    error PriceMismatch(uint256 sent, uint256 price);
    error OfferExpired(uint256 offerId, uint64 expiry);
    error OfferNotActive(uint256 offerId);
    error CannotCancelOthersListing();

    function createListing(uint256 tokenId, uint256 price) external; // token owner
    function cancelListing(uint256 tokenId) external; // seller only
    function buy(uint256 tokenId) external payable; // CEI + nonReentrant
    function createOffer(uint256 tokenId, uint64 expiry) external payable returns (uint256 offerId);
    function cancelOffer(uint256 offerId) external; // buyer only
    function acceptOffer(uint256 offerId) external; // token owner; reverts if expired
}
