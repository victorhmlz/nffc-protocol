/**
 * Off-chain mirror of `NFFC.sol`'s mint-time composition invariants I1–I8
 * (`docs/spec/02-domain-model.md` §4) — the validator named in this module's
 * own header as TASK-17's job. Used by the create wizard's Step 4 (Validation).
 *
 * Unlike the contract, which reverts on the first violation, this collects
 * **every** violation in one pass — the wizard shows the user everything wrong
 * at once, not one revert at a time (`docs/spec/07-ux-map.md` §4 step 4:
 * "blocking errors explained in plain language").
 */
import type { AssetId, RepresentationId } from "@domain/registry/types";
import {
  BPS_TOTAL,
  MAX_COMPONENTS,
  MIN_COMPONENTS,
} from "@domain/nffc/composition";

export interface CandidateComponent {
  readonly assetId: AssetId;
  readonly representationId: RepresentationId;
  readonly weightBps: number;
}

/**
 * What the validator needs to know about the registry — exactly the two
 * on-chain reads `NFFC.mint` makes per component (I5, I6). A real caller wires
 * this to indexed/contract reads; tests inject a fake.
 */
export interface RepresentationLookup {
  isActiveRepresentation(representationId: RepresentationId): boolean;
  resolvesTo(representationId: RepresentationId, assetId: AssetId): boolean;
}

export type CompositionIssueCode =
  | "I1_COMPONENT_COUNT"
  | "I2_WEIGHT_SUM"
  | "I3_DUPLICATE_ASSET"
  | "I4_ZERO_WEIGHT"
  | "I5_REPRESENTATION_NOT_ACTIVE"
  | "I6_REPRESENTATION_ASSET_MISMATCH";

export interface CompositionIssue {
  readonly code: CompositionIssueCode;
  /** Plain-language, ready to show the user (ux-map §4 step 4). */
  readonly message: string;
  readonly assetId?: AssetId;
  readonly representationId?: RepresentationId;
}

export interface CompositionValidationResult {
  readonly ok: boolean;
  readonly issues: readonly CompositionIssue[];
  /** Present regardless of `ok`, so the UI can show a live running total. */
  readonly weightSumBps: number;
}

export function validateComposition(
  components: readonly CandidateComponent[],
  lookup: RepresentationLookup,
): CompositionValidationResult {
  const issues: CompositionIssue[] = [];

  if (
    components.length < MIN_COMPONENTS ||
    components.length > MAX_COMPONENTS
  ) {
    issues.push({
      code: "I1_COMPONENT_COUNT",
      message: `A composition must have between ${MIN_COMPONENTS} and ${MAX_COMPONENTS} components (currently ${components.length}).`,
    });
  }

  const seenAssets = new Set<AssetId>();
  let weightSumBps = 0;

  for (const c of components) {
    weightSumBps += c.weightBps;

    if (seenAssets.has(c.assetId)) {
      issues.push({
        code: "I3_DUPLICATE_ASSET",
        message: `"${c.assetId}" is already in this composition — each asset can appear only once.`,
        assetId: c.assetId,
      });
    }
    seenAssets.add(c.assetId);

    if (c.weightBps <= 0) {
      issues.push({
        code: "I4_ZERO_WEIGHT",
        message: `"${c.assetId}" has a zero weight — every component must have a weight greater than zero.`,
        assetId: c.assetId,
        representationId: c.representationId,
      });
    }

    if (!lookup.isActiveRepresentation(c.representationId)) {
      issues.push({
        code: "I5_REPRESENTATION_NOT_ACTIVE",
        message: `The representation for "${c.assetId}" is not currently registered and active.`,
        assetId: c.assetId,
        representationId: c.representationId,
      });
    } else if (!lookup.resolvesTo(c.representationId, c.assetId)) {
      issues.push({
        code: "I6_REPRESENTATION_ASSET_MISMATCH",
        message: `The selected representation for "${c.assetId}" does not resolve to that asset.`,
        assetId: c.assetId,
        representationId: c.representationId,
      });
    }
  }

  if (components.length > 0 && weightSumBps !== BPS_TOTAL) {
    issues.push({
      code: "I2_WEIGHT_SUM",
      message: `Weights must sum to exactly ${BPS_TOTAL.toLocaleString()} bps (100%) — currently ${weightSumBps.toLocaleString()}.`,
    });
  }

  return { ok: issues.length === 0, issues, weightSumBps };
}
