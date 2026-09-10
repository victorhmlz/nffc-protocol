// SPDX-License-Identifier: MIT
pragma solidity 0.8.34;

/// Test double: a deployed contract (has code) that does NOT expose `decimals()`.
contract NoMetadata {
    uint256 public value = 1;
}
