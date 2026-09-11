/**
 * Wizard-facing (flat, display-ready) view of a registered, active
 * representation — what Step 2 (Asset Selection) lists. A real caller builds
 * this from the indexer (TASK-20/24); until then a fixture feeds `/create`
 * and `/style-guide`. Deliberately flat (not the split `AssetIdentity` /
 * `Representation` domain shape) — the wizard only needs to display and pick.
 */
import type {
  AssetClass,
  AssetId,
  ProviderId,
  RepresentationId,
} from "@domain/registry/types";

export interface AvailableAsset {
  readonly assetId: AssetId;
  readonly assetSymbol: string;
  readonly assetName: string;
  readonly assetClass: AssetClass;
  readonly providerId: ProviderId;
  readonly representationId: RepresentationId;
}

/**
 * The Step 6 (Fees) breakdown, in wei — shown in full **before** signing,
 * never after (TASK-17 acceptance). `null` fields mean "not applicable /
 * not simulated yet", never a silently-omitted line item.
 *
 * A real caller computes this from `Collection.quoteCollectionCreationFee`
 * (TASK-10) + the mint fee (`IFeeConfig`, TASK-30, not wired into `NFFC.sol`
 * yet) + a wallet gas simulation; until those are deployed (TASK-31) the
 * `/create` page supplies a documented fixture.
 */
export interface FeeQuote {
  /** `null` when minting into an existing collection (no creation fee). */
  readonly collectionCreationFeeWei: bigint | null;
  readonly mintFeeWei: bigint;
  /** `null` until a simulation has run. */
  readonly gasEstimateWei: bigint | null;
  readonly totalWei: bigint;
}
