import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

/** Page gutter + max content width. `wide` for dense market/table views. */
export function Container({
  className,
  wide,
  ...props
}: ComponentProps<"div"> & { wide?: boolean }) {
  return (
    <div
      className={cn(
        "mx-auto w-full px-4 sm:px-6 lg:px-8",
        wide ? "max-w-[1600px]" : "max-w-6xl",
        className,
      )}
      {...props}
    />
  );
}
