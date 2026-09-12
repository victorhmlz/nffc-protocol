/**
 * Stand-in for `FeeConfig.sol` (TASK-30) — the exact default values that
 * contract's own constructor accepts, so this fixture and a real deployment
 * agree once TASK-36 wires one in. `src/lib/admin/get-fee-config.ts` is the
 * only importer.
 */
import type { FeeConfigSnapshot } from "@/lib/admin/types";
import { FIXTURE_LISTINGS } from "@/lib/marketplace/fixture-listings";

export const FIXTURE_FEE_CONFIG: FeeConfigSnapshot = {
  collectionFeeCurve: { base: 10_000_000_000_000_000n, slope: 5_000_000_000_000_000n }, // 0.01 / 0.005 ETH
  mintFeeCurve: { base: 1_000_000_000_000_000n, slope: 500_000_000_000_000n }, // 0.001 / 0.0005 ETH
  marketplaceFeeBps: 150, // 1.5% — the whitepaper's non-binding V1 target
  feeRecipient: "0x9999999999999999999999999999999999f00d",
  // A representative royalty on one real fixture collection, so the UI has
  // something non-empty to render — matches Blue Chips' collectionId in
  // `FIXTURE_LISTINGS`.
  royaltyBpsByCollection: { [FIXTURE_LISTINGS[0]!.collectionId]: 250 },
};
