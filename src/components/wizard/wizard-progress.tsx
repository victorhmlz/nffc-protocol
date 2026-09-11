import { CheckCircle2, Circle } from "lucide-react";
import { cn } from "@/lib/cn";
import {
  WIZARD_STEP_LABEL,
  WIZARD_STEPS,
  type WizardStepId,
} from "@/lib/wizard/wizard-state";

export interface WizardProgressProps {
  readonly current: WizardStepId;
  /** Only steps at or before `current` are clickable (`GOTO` never jumps ahead). */
  readonly onSelect: (step: WizardStepId) => void;
  readonly className?: string;
}

export function WizardProgress({
  current,
  onSelect,
  className,
}: WizardProgressProps) {
  const currentIndex = WIZARD_STEPS.indexOf(current);

  return (
    <ol className={cn("flex flex-wrap gap-2", className)}>
      {WIZARD_STEPS.map((step, i) => {
        const done = i < currentIndex;
        const active = step === current;
        const reachable = i <= currentIndex;
        return (
          <li key={step}>
            <button
              type="button"
              disabled={!reachable}
              onClick={() => onSelect(step)}
              aria-current={active ? "step" : undefined}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                active
                  ? "border-primary bg-accent text-accent-foreground"
                  : done
                    ? "border-border-strong text-foreground hover:bg-muted"
                    : "border-border text-subtle-foreground",
                !reachable && "cursor-not-allowed opacity-50",
              )}
            >
              {done ? (
                <CheckCircle2 aria-hidden className="size-3.5 text-gain" />
              ) : (
                <Circle aria-hidden className="size-3.5" />
              )}
              {i + 1}. {WIZARD_STEP_LABEL[step]}
            </button>
          </li>
        );
      })}
    </ol>
  );
}
