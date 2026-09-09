"use client";

import {
  type ComponentProps,
  type ReactElement,
  type ReactNode,
  createContext,
  useContext,
  useId,
} from "react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/lib/cn";
import { Label } from "@/components/ui/label";

interface FieldContext {
  id: string;
  hintId: string;
  errorId: string;
  describedBy: string | undefined;
  invalid: boolean;
}

const Ctx = createContext<FieldContext | null>(null);

function useFieldContext(part: string): FieldContext {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error(`<${part}> must be used inside <Field>`);
  return ctx;
}

/**
 * Groups a label, a control, and hint/error text, wiring `htmlFor`, `id`,
 * `aria-describedby`, and `aria-invalid` between them. Compositional so it works
 * from Server Components (children are elements, not functions):
 *
 *   <Field hasError>
 *     <FieldLabel>Symbol</FieldLabel>
 *     <FieldControl><Input defaultValue="SEMI" /></FieldControl>
 *     <FieldError>Symbol is already taken.</FieldError>
 *   </Field>
 */
export function Field({
  invalid = false,
  hasHint = false,
  hasError = false,
  className,
  children,
}: {
  invalid?: boolean;
  /** Set when a <FieldHint> is present, so it joins `aria-describedby`. */
  hasHint?: boolean;
  /** Set when a <FieldError> is present. Also marks the control invalid. */
  hasError?: boolean;
  className?: string;
  children: ReactNode;
}) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy =
    [hasError ? errorId : null, hasHint ? hintId : null]
      .filter(Boolean)
      .join(" ") || undefined;

  return (
    <Ctx.Provider
      value={{ id, hintId, errorId, describedBy, invalid: invalid || hasError }}
    >
      <div className={cn("flex flex-col gap-1.5", className)}>{children}</div>
    </Ctx.Provider>
  );
}

export function FieldLabel({ ...props }: ComponentProps<"label">) {
  const { id } = useFieldContext("FieldLabel");
  return <Label htmlFor={id} {...props} />;
}

/** Injects `id` + aria wiring into its single child control (Radix `Slot`). */
export function FieldControl({ children }: { children: ReactElement }) {
  const { id, describedBy, invalid } = useFieldContext("FieldControl");
  return (
    <Slot
      id={id}
      aria-describedby={describedBy}
      aria-invalid={invalid || undefined}
    >
      {children}
    </Slot>
  );
}

export function FieldHint({ className, ...props }: ComponentProps<"p">) {
  const { hintId } = useFieldContext("FieldHint");
  return (
    <p
      id={hintId}
      className={cn("text-xs text-subtle-foreground", className)}
      {...props}
    />
  );
}

export function FieldError({ className, ...props }: ComponentProps<"p">) {
  const { errorId } = useFieldContext("FieldError");
  return (
    <p id={errorId} className={cn("text-xs text-loss", className)} {...props} />
  );
}
