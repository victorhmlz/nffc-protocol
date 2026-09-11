import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

/**
 * A native `<select>`, styled to match `Input` — the marketplace filter bar
 * (TASK-20) is this project's first control that needs one; added here
 * (rather than as an inline style) so later filter/sort UIs reuse it too.
 */
export function Select({ className, ...props }: ComponentProps<"select">) {
  return (
    <select
      className={cn(
        "h-9 w-full rounded-md border border-input bg-surface px-3 text-sm",
        "text-foreground",
        "transition-colors duration-[var(--duration-fast)]",
        "focus-visible:border-ring",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}
