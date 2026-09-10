// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IRepresentationRegistry} from "./IRepresentationRegistry.sol";

/**
 * The on-chain adapter for one asset provider. Robinhood (TASK-06) and native
 * crypto (TASK-07) implement it as **peers** — no hierarchy — sharing this whole
 * interface *and* one implementation (`ProviderAdapterBase`); each subclass only
 * supplies its `providerId` / `assetClass` / token standard
 * (`docs/spec/05-adapter-architecture.md`).
 *
 * An adapter is the single authorised on-chain entry point for its provider's
 * representation lifecycle, `SYNC_ROLE`-gated. Price reads live in the off-chain
 * Price Engine (TASK-22).
 */
interface IProviderAdapter {
    struct SyncEntry {
        string symbol;
        string name;
        address token;
        uint8 decimals;
        uint256 multiplier;
        IRepresentationRegistry.OracleMetadata oracle;
    }

    event RepresentationSynced(
        bytes32 indexed representationId, address indexed token, string symbol, bool created
    );
    event RepresentationDeactivated(bytes32 indexed representationId);

    error ZeroAddress();

    function providerId() external view returns (bytes32);
    function assetClass() external view returns (bytes32);

    /// @notice Register / refresh / re-activate one of this provider's
    /// representations, creating its asset identity if missing. `SYNC_ROLE` only.
    function syncUpsert(SyncEntry calldata entry) external returns (bytes32 representationId);

    /// @notice Mark a representation inactive (provider delisted it). `SYNC_ROLE` only.
    function syncDeactivate(bytes32 representationId) external;

    /// @notice Same, addressed by token (the worker knows tokens, not ids).
    function syncDeactivateByToken(address token) external;
}
