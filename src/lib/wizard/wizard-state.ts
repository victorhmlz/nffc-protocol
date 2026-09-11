/**
 * The 7-step create wizard's step state machine (`docs/spec/07-ux-map.md` §4;
 * `NFFC_Development_Plan.md` v3.2 TASK-17). A total, forward-gated reducer —
 * the same design language as TASK-16's `transactionFlowReducer` — so the
 * TASK-17 acceptance criteria hold **structurally**, not just by UI
 * discipline:
 *
 * - `validation → preview` requires a passing {@link CompositionValidationResult}
 *   (I1–I8 must be satisfied before the art preview, which is the exact
 *   post-mint output, can be shown).
 * - `fees → mint` requires `ACKNOWLEDGE_FEES` to have fired — which only a
 *   rendered Fees step can dispatch — so the total fee is unconditionally
 *   seen before the Mint step (and therefore before signing) is reachable.
 * - `GOTO` can only move to a step at or before the current one — jumping
 *   *ahead* is only ever possible one step at a time via a gated `NEXT`.
 */
import type {
  AssetClass,
  AssetId,
  ProviderId,
  RepresentationId,
} from "@domain/registry/types";
import { MIN_COMPONENTS } from "@domain/nffc/composition";
import type { CompositionValidationResult } from "@domain/nffc/validate-composition";
import type { AvailableAsset } from "@/lib/wizard/types";

export const WIZARD_STEPS = [
  "basic-info",
  "assets",
  "weights",
  "validation",
  "preview",
  "fees",
  "mint",
] as const;
export type WizardStepId = (typeof WIZARD_STEPS)[number];

export const WIZARD_STEP_LABEL: Record<WizardStepId, string> = {
  "basic-info": "Basic information",
  assets: "Asset selection",
  weights: "Weights",
  validation: "Validation",
  preview: "Preview",
  fees: "Fees",
  mint: "Mint",
};

export interface BasicInfo {
  readonly name: string;
  readonly description: string;
  readonly collectionMode: "new" | "existing";
  readonly existingCollectionId?: string;
  readonly newCollectionName?: string;
}

export interface WizardComponentDraft {
  readonly assetId: AssetId;
  readonly representationId: RepresentationId;
  readonly assetSymbol: string;
  readonly assetClass: AssetClass;
  readonly providerId: ProviderId;
  readonly weightBps: number;
}

export interface WizardState {
  readonly step: WizardStepId;
  readonly basicInfo: BasicInfo | null;
  readonly components: readonly WizardComponentDraft[];
  readonly validation: CompositionValidationResult | null;
  readonly feesAcknowledged: boolean;
}

export const INITIAL_WIZARD_STATE: WizardState = {
  step: "basic-info",
  basicInfo: null,
  components: [],
  validation: null,
  feesAcknowledged: false,
};

export type WizardAction =
  | { readonly type: "SET_BASIC_INFO"; readonly basicInfo: BasicInfo }
  | { readonly type: "ADD_ASSET"; readonly asset: AvailableAsset }
  | {
      readonly type: "REMOVE_ASSET";
      readonly representationId: RepresentationId;
    }
  | {
      readonly type: "SET_WEIGHT";
      readonly representationId: RepresentationId;
      readonly weightBps: number;
    }
  | {
      readonly type: "SET_VALIDATION";
      readonly result: CompositionValidationResult;
    }
  | { readonly type: "ACKNOWLEDGE_FEES" }
  | { readonly type: "NEXT" }
  | { readonly type: "BACK" }
  | { readonly type: "GOTO"; readonly step: WizardStepId };

export class WizardStepBlockedError extends Error {
  override name = "WizardStepBlockedError";
  constructor(step: WizardStepId, reason: string) {
    super(`Cannot leave step "${step}": ${reason}`);
  }
}

function stepIndex(step: WizardStepId): number {
  return WIZARD_STEPS.indexOf(step);
}

/** Whether the wizard may advance past `state.step` right now. */
export function canAdvance(state: WizardState): boolean {
  switch (state.step) {
    case "basic-info":
      return state.basicInfo !== null && state.basicInfo.name.trim().length > 0;
    case "assets":
      return state.components.length >= MIN_COMPONENTS;
    case "weights":
      return state.components.length >= MIN_COMPONENTS;
    case "validation":
      return state.validation !== null && state.validation.ok;
    case "preview":
      return true;
    case "fees":
      return state.feesAcknowledged;
    case "mint":
      return false; // terminal — nothing follows Mint in this wizard
  }
}

function blockReason(state: WizardState): string {
  switch (state.step) {
    case "basic-info":
      return "a non-empty name is required";
    case "assets":
      return `at least ${MIN_COMPONENTS} asset must be selected`;
    case "weights":
      return `at least ${MIN_COMPONENTS} asset must be selected`;
    case "validation":
      return "the composition has unresolved validation issues (I1–I8)";
    case "preview":
      return "unreachable";
    case "fees":
      return "the fee total must be acknowledged before minting";
    case "mint":
      return "Mint is the last step";
  }
}

export function wizardReducer(
  state: WizardState,
  action: WizardAction,
): WizardState {
  switch (action.type) {
    case "SET_BASIC_INFO":
      return { ...state, basicInfo: action.basicInfo };

    case "ADD_ASSET": {
      if (
        state.components.some(
          (c) => c.representationId === action.asset.representationId,
        )
      ) {
        return state; // already selected — no-op, not an error
      }
      const draft: WizardComponentDraft = {
        assetId: action.asset.assetId,
        representationId: action.asset.representationId,
        assetSymbol: action.asset.assetSymbol,
        assetClass: action.asset.assetClass,
        providerId: action.asset.providerId,
        weightBps: 0,
      };
      return {
        ...state,
        components: [...state.components, draft],
        validation: null,
        feesAcknowledged: false,
      };
    }

    case "REMOVE_ASSET":
      return {
        ...state,
        components: state.components.filter(
          (c) => c.representationId !== action.representationId,
        ),
        validation: null,
        feesAcknowledged: false,
      };

    case "SET_WEIGHT":
      return {
        ...state,
        components: state.components.map((c) =>
          c.representationId === action.representationId
            ? { ...c, weightBps: action.weightBps }
            : c,
        ),
        validation: null,
        feesAcknowledged: false,
      };

    case "SET_VALIDATION":
      return { ...state, validation: action.result };

    case "ACKNOWLEDGE_FEES":
      return { ...state, feesAcknowledged: true };

    case "NEXT": {
      const i = stepIndex(state.step);
      if (i === WIZARD_STEPS.length - 1) {
        throw new WizardStepBlockedError(state.step, blockReason(state));
      }
      if (!canAdvance(state)) {
        throw new WizardStepBlockedError(state.step, blockReason(state));
      }
      return { ...state, step: WIZARD_STEPS[i + 1]! };
    }

    case "BACK": {
      const i = stepIndex(state.step);
      if (i === 0) return state;
      return { ...state, step: WIZARD_STEPS[i - 1]! };
    }

    case "GOTO": {
      if (stepIndex(action.step) > stepIndex(state.step)) {
        throw new WizardStepBlockedError(
          state.step,
          `cannot jump ahead to "${action.step}" — advance one step at a time via NEXT`,
        );
      }
      return { ...state, step: action.step };
    }
  }
}
