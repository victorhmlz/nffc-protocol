// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * NFFC — the ERC-721 core. A token whose *composition* is a weighted set of
 * verified on-chain asset representations, fixed forever at mint.
 * See docs/spec/02-domain-model.md §2.5 / §4 and docs/spec/04-contract-interfaces.md §4.
 *
 * The concrete contract (`NFFC.sol`, TASK-09) also implements `IERC721` /
 * `IERC721Metadata` via OpenZeppelin; this interface fixes only the
 * NFFC-specific surface.
 */
interface INFFC {
    /// One position in a composition. `assetId` and `representationId` are both
    /// pinned (docs/spec/02-domain-model.md §3): the chosen representation stays
    /// part of the historical record even if it is later deactivated.
    struct Component {
        bytes32 assetId;
        bytes32 representationId;
        uint16 weightBps; // > 0; the whole composition sums to 10_000
    }

    struct MintParams {
        uint256 collectionId;
        Component[] components; // length 1..20
        string staticMetadataURI; // immutable metadata (composition + art + traits)
    }

    /// I8 — a complete record of every mint.
    event NFFCMinted(
        uint256 indexed tokenId,
        uint256 indexed collectionId,
        address indexed creator,
        bytes32 compositionHash, // keccak256(abi.encode(components)) in mint order
        uint16 componentCount
    );
    /// I8 — the full composition, so an indexer never has to reconstruct it.
    event NFFCCompositionRecorded(uint256 indexed tokenId, Component[] components);

    error ZeroAddress();
    error InvalidComponentCount(uint256 count); // I1: 1 <= n <= 20
    error WeightSumNot10000(uint256 sum); // I2
    error DuplicateAsset(bytes32 assetId); // I3
    error ZeroWeight(bytes32 assetId); // I4
    error RepresentationNotActive(bytes32 representationId); // I5: registered AND active
    error RepresentationAssetMismatch(bytes32 representationId, bytes32 assetId); // I6
    /// I7. Unreachable in this implementation — the composition has no mutator at
    /// all (see the note below); retained so the interface matches the spec surface.
    error CompositionIsImmutable();
    /// The mint fee (docs/spec/06-fee-model.md) is routed via `IFeeConfig` (TASK-30);
    /// until that exists, `mint` is payable but must be called with no value.
    error UnexpectedPayment();

    function mint(MintParams calldata params) external payable returns (uint256 tokenId);

    function getComposition(uint256 tokenId) external view returns (Component[] memory);
    function getCompositionHash(uint256 tokenId) external view returns (bytes32);
    function getSegment(uint256 tokenId) external view returns (uint8); // 0 CRYPTO_ONLY, 1 STOCK_ONLY, 2 MIXED
    function getStaticRarity(uint256 tokenId) external view returns (uint256);
    // NOTE: there is intentionally NO setComposition / addComponent / reweight of
    // any kind, under any role. I7 is enforced structurally, not by a guard.
}
