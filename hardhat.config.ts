import hardhatToolboxViemPlugin from "@nomicfoundation/hardhat-toolbox-viem";
import { defineConfig } from "hardhat/config";

/**
 * Smart-contract build/test config (TASK-05). Contracts, mocks and Solidity
 * tests all live under `contracts/`; `.t.sol` files run as tests.
 *
 * Requires Node >= 22.13 (Hardhat 3). Run: `pnpm contracts:build`,
 * `pnpm contracts:test`.
 */
export default defineConfig({
  plugins: [hardhatToolboxViemPlugin],
  solidity: {
    profiles: {
      default: {
        version: "0.8.34",
      },
      production: {
        version: "0.8.34",
        settings: {
          optimizer: { enabled: true, runs: 200 },
          evmVersion: "shanghai", // conservative for Robinhood Chain (Arbitrum L2)
        },
      },
    },
  },
  networks: {
    hardhat: {
      type: "edr-simulated",
      chainType: "l1",
    },
  },
});
