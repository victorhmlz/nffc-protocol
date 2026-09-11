import { describe, expect, it } from "vitest";
import type {
  AssetId,
  ProviderId,
  RepresentationId,
} from "@domain/registry/types";
import type { CompositionValidationResult } from "@domain/nffc/validate-composition";
import type { AvailableAsset } from "@/lib/wizard/types";
import {
  INITIAL_WIZARD_STATE,
  WIZARD_STEPS,
  WizardStepBlockedError,
  wizardReducer,
  type WizardState,
} from "@/lib/wizard/wizard-state";

function id<T>(s: string): T {
  return s as T;
}

const NVDA_ASSET: AvailableAsset = {
  assetId: id<AssetId>("0xNVDA"),
  assetSymbol: "NVDA",
  assetName: "NVIDIA",
  assetClass: "EQUITY",
  providerId: id<ProviderId>("ROBINHOOD"),
  representationId: id<RepresentationId>("0xNVDArep"),
};

const BTC_ASSET: AvailableAsset = {
  assetId: id<AssetId>("0xBTC"),
  assetSymbol: "BTC",
  assetName: "Bitcoin",
  assetClass: "CRYPTO",
  providerId: id<ProviderId>("CRYPTO_NATIVE"),
  representationId: id<RepresentationId>("0xBTCrep"),
};

const OK_VALIDATION: CompositionValidationResult = {
  ok: true,
  issues: [],
  weightSumBps: 10_000,
};
const FAILING_VALIDATION: CompositionValidationResult = {
  ok: false,
  issues: [{ code: "I2_WEIGHT_SUM", message: "nope" }],
  weightSumBps: 4000,
};

function withAsset(state: WizardState, asset: AvailableAsset): WizardState {
  return wizardReducer(state, { type: "ADD_ASSET", asset });
}

describe("wizardReducer — the full happy path, one step at a time", () => {
  it("basic-info -> assets -> weights -> validation -> preview -> fees -> mint", () => {
    let s = INITIAL_WIZARD_STATE;
    s = wizardReducer(s, {
      type: "SET_BASIC_INFO",
      basicInfo: { name: "Blue Chips", description: "", collectionMode: "new" },
    });
    s = wizardReducer(s, { type: "NEXT" });
    expect(s.step).toBe("assets");

    s = withAsset(s, NVDA_ASSET);
    s = withAsset(s, BTC_ASSET);
    s = wizardReducer(s, { type: "NEXT" });
    expect(s.step).toBe("weights");

    s = wizardReducer(s, {
      type: "SET_WEIGHT",
      representationId: NVDA_ASSET.representationId,
      weightBps: 6000,
    });
    s = wizardReducer(s, {
      type: "SET_WEIGHT",
      representationId: BTC_ASSET.representationId,
      weightBps: 4000,
    });
    s = wizardReducer(s, { type: "NEXT" });
    expect(s.step).toBe("validation");

    s = wizardReducer(s, { type: "SET_VALIDATION", result: OK_VALIDATION });
    s = wizardReducer(s, { type: "NEXT" });
    expect(s.step).toBe("preview");

    s = wizardReducer(s, { type: "NEXT" });
    expect(s.step).toBe("fees");

    s = wizardReducer(s, { type: "ACKNOWLEDGE_FEES" });
    s = wizardReducer(s, { type: "NEXT" });
    expect(s.step).toBe("mint");
  });
});

describe("wizardReducer — forward progress is gated (TASK-17 acceptance)", () => {
  it("cannot leave basic-info without a name", () => {
    expect(() => wizardReducer(INITIAL_WIZARD_STATE, { type: "NEXT" })).toThrow(
      WizardStepBlockedError,
    );
  });

  it("cannot leave assets with zero components selected", () => {
    let s = wizardReducer(INITIAL_WIZARD_STATE, {
      type: "SET_BASIC_INFO",
      basicInfo: { name: "x", description: "", collectionMode: "new" },
    });
    s = wizardReducer(s, { type: "NEXT" }); // -> assets
    expect(() => wizardReducer(s, { type: "NEXT" })).toThrow(
      WizardStepBlockedError,
    );
  });

  it("cannot reach preview without a passing validation result — the art-preview acceptance", () => {
    let s: WizardState = { ...INITIAL_WIZARD_STATE, step: "validation" };
    expect(() => wizardReducer(s, { type: "NEXT" })).toThrow(
      WizardStepBlockedError,
    );

    s = wizardReducer(s, {
      type: "SET_VALIDATION",
      result: FAILING_VALIDATION,
    });
    expect(() => wizardReducer(s, { type: "NEXT" })).toThrow(
      WizardStepBlockedError,
    );

    s = wizardReducer(s, { type: "SET_VALIDATION", result: OK_VALIDATION });
    expect(wizardReducer(s, { type: "NEXT" }).step).toBe("preview");
  });

  it("cannot reach mint without acknowledging fees — the fee-before-signing acceptance", () => {
    const s: WizardState = {
      ...INITIAL_WIZARD_STATE,
      step: "fees",
      feesAcknowledged: false,
    };
    expect(() => wizardReducer(s, { type: "NEXT" })).toThrow(
      WizardStepBlockedError,
    );

    const acked = wizardReducer(s, { type: "ACKNOWLEDGE_FEES" });
    expect(wizardReducer(acked, { type: "NEXT" }).step).toBe("mint");
  });

  it("mint is terminal — NEXT from mint throws", () => {
    const s: WizardState = { ...INITIAL_WIZARD_STATE, step: "mint" };
    expect(() => wizardReducer(s, { type: "NEXT" })).toThrow(
      WizardStepBlockedError,
    );
  });
});

describe("wizardReducer — editing the composition invalidates stale validation/fees", () => {
  it("ADD_ASSET / REMOVE_ASSET / SET_WEIGHT reset validation and feesAcknowledged", () => {
    const validated: WizardState = {
      ...INITIAL_WIZARD_STATE,
      components: [{ ...NVDA_ASSET, weightBps: 10_000 } as never],
      validation: OK_VALIDATION,
      feesAcknowledged: true,
    };

    expect(withAsset(validated, BTC_ASSET).validation).toBeNull();
    expect(withAsset(validated, BTC_ASSET).feesAcknowledged).toBe(false);

    const removed = wizardReducer(validated, {
      type: "REMOVE_ASSET",
      representationId: NVDA_ASSET.representationId,
    });
    expect(removed.validation).toBeNull();
    expect(removed.feesAcknowledged).toBe(false);

    const reweighted = wizardReducer(validated, {
      type: "SET_WEIGHT",
      representationId: NVDA_ASSET.representationId,
      weightBps: 9000,
    });
    expect(reweighted.validation).toBeNull();
    expect(reweighted.feesAcknowledged).toBe(false);
  });

  it("ADD_ASSET is a no-op when the representation is already selected", () => {
    const s = withAsset(INITIAL_WIZARD_STATE, NVDA_ASSET);
    const again = withAsset(s, NVDA_ASSET);
    expect(again.components).toHaveLength(1);
  });
});

describe("wizardReducer — BACK and GOTO", () => {
  it("BACK moves one step back; no-ops at the first step", () => {
    const s: WizardState = { ...INITIAL_WIZARD_STATE, step: "weights" };
    expect(wizardReducer(s, { type: "BACK" }).step).toBe("assets");
    expect(wizardReducer(INITIAL_WIZARD_STATE, { type: "BACK" }).step).toBe(
      "basic-info",
    );
  });

  it("GOTO to an earlier or the same step is allowed", () => {
    const s: WizardState = { ...INITIAL_WIZARD_STATE, step: "fees" };
    expect(wizardReducer(s, { type: "GOTO", step: "basic-info" }).step).toBe(
      "basic-info",
    );
    expect(wizardReducer(s, { type: "GOTO", step: "fees" }).step).toBe("fees");
  });

  it("GOTO ahead of the current step is rejected — only a gated NEXT can advance", () => {
    const s: WizardState = { ...INITIAL_WIZARD_STATE, step: "assets" };
    expect(() => wizardReducer(s, { type: "GOTO", step: "mint" })).toThrow(
      WizardStepBlockedError,
    );
  });
});

describe("WIZARD_STEPS", () => {
  it("is the 7 steps in spec order", () => {
    expect(WIZARD_STEPS).toEqual([
      "basic-info",
      "assets",
      "weights",
      "validation",
      "preview",
      "fees",
      "mint",
    ]);
  });
});
