// SPDX-License-Identifier: MIT
pragma solidity 0.8.34;

import {ProviderAdapterBase} from "./ProviderAdapterBase.sol";

/**
 * Provider adapter for native cryptocurrencies (BTC, ETH, …), available from V1
 * alongside Robinhood — a **peer**, same interface, same base implementation.
 * Creates only `CRYPTO`-class asset identities and manages only `CRYPTO_NATIVE`
 * representations. The token is a verified wrapped/homolog ERC-20 (WBTC/WETH per
 * the network); Chainlink is the price source (validated in TASK-22). Fed by
 * `workers/crypto-sync/`.
 */
contract CryptoAdapter is ProviderAdapterBase {
    constructor(
        address admin,
        address syncSigner,
        address assetRegistry_,
        address representationRegistry_,
        uint256 chainId_
    ) ProviderAdapterBase(admin, syncSigner, assetRegistry_, representationRegistry_, chainId_) {}

    function _providerId() internal pure override returns (bytes32) {
        return bytes32("CRYPTO_NATIVE");
    }

    function _assetClass() internal pure override returns (bytes32) {
        return bytes32("CRYPTO");
    }

    function _tokenStandard() internal pure override returns (bytes32) {
        return bytes32("ERC20");
    }
}
