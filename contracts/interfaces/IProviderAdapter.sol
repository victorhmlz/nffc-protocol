// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * The on-chain adapter for one asset provider. Robinhood (TASK-06) and native
 * crypto (TASK-07) implement it as peers — no hierarchy
 * (`docs/spec/05-adapter-architecture.md`).
 *
 * An adapter is the single authorised on-chain entry point for its provider's
 * representation lifecycle. Registration/upsert is provider-specific (each
 * provider's authoritative feed has a different shape); {syncDeactivate} is
 * uniform. Price reads live in the off-chain Price Engine (TASK-22).
 */
interface IProviderAdapter {
    function providerId() external view returns (bytes32);

    /// @notice Mark one of this provider's representations inactive (e.g. the
    /// provider delisted the asset). `SYNC_ROLE` only.
    function syncDeactivate(bytes32 representationId) external;
}
