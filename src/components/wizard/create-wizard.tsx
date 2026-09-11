"use client";

import { useEffect, useReducer } from "react";
import type { useWriteContract } from "wagmi";
import {
  validateComposition,
  type RepresentationLookup,
} from "@domain/nffc/validate-composition";
import type { RepresentationId } from "@domain/registry/types";
import type { AvailableAsset, FeeQuote } from "@/lib/wizard/types";
import { useMintFlow } from "@/lib/wizard/use-mint-flow";
import { INITIAL_WIZARD_STATE, wizardReducer, type WizardComponentDraft } from "@/lib/wizard/wizard-state";
import { StepAssetSelection } from "@/components/wizard/step-asset-selection";
import { StepBasicInfo } from "@/components/wizard/step-basic-info";
import { StepFees } from "@/components/wizard/step-fees";
import { StepMint } from "@/components/wizard/step-mint";
import { StepPreview } from "@/components/wizard/step-preview";
import { StepValidation } from "@/components/wizard/step-validation";
import { StepWeights } from "@/components/wizard/step-weights";
import { WizardProgress } from "@/components/wizard/wizard-progress";

type WriteContractParams = Parameters<ReturnType<typeof useWriteContract>["writeContract"]>[0];

export interface CreateWizardProps {
  /** Every registered, active representation, both providers, one list. */
  readonly availableAssets: readonly AvailableAsset[];
  /** Step 4's I5/I6 checks — a real caller wires this to the registry/indexer. */
  readonly lookup: RepresentationLookup;
  readonly quoteFees: (componentCount: number) => FeeQuote;
  /** Step 7 (TASK-18): generate the art + mint-condition trait and pin them —
   *  the correct point in the flow, before simulation. */
  readonly prepareMintMetadata: (components: readonly WizardComponentDraft[]) => Promise<string>;
  /** Throws/rejects on a failed simulation, communicated before any signature
   *  is requested (TASK-18 acceptance). */
  readonly simulateMint: (staticMetadataURI: string) => Promise<void>;
  readonly buildMintCall: (staticMetadataURI: string) => WriteContractParams;
}

/** The 7-step create wizard (`/create`, TASK-17/18; `docs/create-wizard.md`). */
export function CreateWizard({
  availableAssets,
  lookup,
  quoteFees,
  prepareMintMetadata,
  simulateMint,
  buildMintCall,
}: CreateWizardProps) {
  const [state, dispatch] = useReducer(wizardReducer, INITIAL_WIZARD_STATE);
  const mint = useMintFlow({
    prepareMetadata: () => prepareMintMetadata(state.components),
    simulateMint,
    buildMintCall,
  });

  // Step 4 runs the full I1–I8 check as soon as it's entered, or whenever the
  // composition changes underneath it (which resets `validation` to null).
  useEffect(() => {
    if (state.step === "validation" && state.validation === null) {
      dispatch({
        type: "SET_VALIDATION",
        result: validateComposition(state.components, lookup),
      });
    }
  }, [state.step, state.validation, state.components, lookup]);

  return (
    <div className="flex flex-col gap-6">
      <WizardProgress
        current={state.step}
        onSelect={(step) => dispatch({ type: "GOTO", step })}
      />

      {state.step === "basic-info" && (
        <StepBasicInfo
          value={state.basicInfo}
          onChange={(basicInfo) =>
            dispatch({ type: "SET_BASIC_INFO", basicInfo })
          }
          onNext={() => dispatch({ type: "NEXT" })}
        />
      )}

      {state.step === "assets" && (
        <StepAssetSelection
          availableAssets={availableAssets}
          selected={state.components}
          onAdd={(asset) => dispatch({ type: "ADD_ASSET", asset })}
          onRemove={(representationId: RepresentationId) =>
            dispatch({ type: "REMOVE_ASSET", representationId })
          }
          onNext={() => dispatch({ type: "NEXT" })}
          canAdvance={state.components.length >= 1}
        />
      )}

      {state.step === "weights" && (
        <StepWeights
          components={state.components}
          onSetWeight={(representationId, weightBps) =>
            dispatch({ type: "SET_WEIGHT", representationId, weightBps })
          }
          onNext={() => dispatch({ type: "NEXT" })}
        />
      )}

      {state.step === "validation" && state.validation && (
        <StepValidation
          result={state.validation}
          onNext={() => dispatch({ type: "NEXT" })}
        />
      )}

      {state.step === "preview" && (
        <StepPreview
          components={state.components}
          onNext={() => dispatch({ type: "NEXT" })}
        />
      )}

      {state.step === "fees" && (
        <StepFees
          quote={quoteFees(state.components.length)}
          onAcknowledge={() => dispatch({ type: "ACKNOWLEDGE_FEES" })}
          onNext={() => dispatch({ type: "NEXT" })}
        />
      )}

      {state.step === "mint" && (
        <StepMint
          state={mint.state}
          isPreparing={mint.isPreparing}
          error={mint.error}
          onMint={mint.mint}
        />
      )}
    </div>
  );
}
