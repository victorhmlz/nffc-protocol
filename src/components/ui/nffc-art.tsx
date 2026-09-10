import type { HTMLAttributes } from "react";
import { renderNffcArt, type ArtInput } from "@domain/art/art";
import { cn } from "@/lib/cn";

export interface NffcArtProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  "children"
> {
  /** Composition + `compositionHash` seed — exactly what `NFFC` exposes on-chain. */
  readonly input: ArtInput;
  /** Accessible description; defaults to a component-count summary. */
  readonly label?: string;
}

/**
 * Renders an NFFC's deterministic generative art (`@domain/art`). The SVG is a
 * pure function of `input` with no user-controlled markup — safe to inject.
 */
export function NffcArt({ input, label, className, ...props }: NffcArtProps) {
  const { svg } = renderNffcArt(input);
  return (
    <div
      role="img"
      aria-label={
        label ??
        `Generative art for a ${input.components.length}-component NFFC`
      }
      className={cn(
        "overflow-hidden rounded-lg border border-border [&>svg]:block [&>svg]:h-auto [&>svg]:w-full",
        className,
      )}
      // deterministic SVG from @domain/art — pure geometry, no user-controlled markup
      dangerouslySetInnerHTML={{ __html: svg }}
      {...props}
    />
  );
}
