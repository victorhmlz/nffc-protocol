import { CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CompositionValidationResult } from "@domain/nffc/validate-composition";

export interface StepValidationProps {
  readonly result: CompositionValidationResult;
  readonly onNext: () => void;
}

/** Full I1–I8 check result, in plain language (ux-map §4 step 4). */
export function StepValidation({ result, onNext }: StepValidationProps) {
  if (result.ok) {
    return (
      <div className="flex flex-col gap-4">
        <p role="status" className="flex items-center gap-2 text-sm text-gain">
          <CheckCircle2 aria-hidden className="size-4" />
          This composition is valid — 1–20 components, weights sum to 10,000
          bps, every representation is registered and active.
        </p>
        <Button type="button" onClick={onNext} className="self-start">
          Continue to preview
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <p
        role="alert"
        className="flex items-center gap-2 text-sm font-medium text-loss"
      >
        <XCircle aria-hidden className="size-4" />
        {result.issues.length} issue{result.issues.length === 1 ? "" : "s"} to
        fix before minting:
      </p>
      <ul className="flex flex-col gap-2">
        {result.issues.map((issue, i) => (
          <li
            key={i}
            className="rounded-md border border-border bg-surface p-3 text-sm text-foreground"
          >
            {issue.message}
          </li>
        ))}
      </ul>
    </div>
  );
}
