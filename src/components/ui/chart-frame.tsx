import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";

interface ChartFrameProps extends Omit<ComponentProps<"figure">, "title"> {
  title: ReactNode;
  /** Legend row — required for 2+ series (docs/design-system.md § Charts). */
  legend?: ReactNode;
  caption?: ReactNode;
  /** Timestamp / oracle source line — market data is never shown without it. */
  meta?: ReactNode;
}

/**
 * Shell every chart mounts into: title, legend row above the plot, a scroll
 * container for the plot, caption and a source/timestamp line below. It carries
 * the chart-chrome tokens; the plot itself (SVG marks, axes, hover) is built per
 * the data-viz procedure in the TASK that needs it.
 */
export function ChartFrame({
  title,
  legend,
  caption,
  meta,
  className,
  children,
  ...props
}: ChartFrameProps) {
  return (
    <figure
      className={cn(
        "flex flex-col gap-3 rounded-lg border border-border bg-chart-surface p-4",
        className,
      )}
      {...props}
    >
      <figcaption className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-semibold tracking-tight">{title}</span>
        {legend && (
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            {legend}
          </div>
        )}
      </figcaption>
      <div className="w-full overflow-x-auto">{children}</div>
      {(caption || meta) && (
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-subtle-foreground">
          {caption ? <span>{caption}</span> : <span />}
          {meta && <span className="tabular">{meta}</span>}
        </div>
      )}
    </figure>
  );
}

/** One legend entry: a colour swatch + label (identity is never colour-alone). */
export function ChartLegendItem({
  color,
  children,
}: {
  /** A `--chart-N` variable name or any CSS colour. */
  color: string;
  children: ReactNode;
}) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        aria-hidden
        className="size-2.5 rounded-xs"
        style={{ backgroundColor: color }}
      />
      {children}
    </span>
  );
}
