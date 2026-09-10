import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

/** Loading placeholder. Every async surface shows this or an explicit error —
    never a blank value (docs/spec/07-ux-map.md §6). */
export function Skeleton({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      aria-hidden
      className={cn("animate-pulse rounded-md bg-muted", className)}
      {...props}
    />
  );
}
