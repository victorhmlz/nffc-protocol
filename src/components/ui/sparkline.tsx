import { cn } from "@/lib/cn";

interface SparklineProps {
  /** Two or more values, oldest → newest. */
  data: readonly number[];
  width?: number;
  height?: number;
  /** Colour role. `auto` = gain if the series ends up, loss if down, muted if flat. */
  tone?: "auto" | "primary" | "gain" | "loss" | "muted";
  /** Draw a marker at the latest value. */
  showEndPoint?: boolean;
  className?: string;
  "aria-label"?: string;
}

const TONE_VAR = {
  primary: "var(--primary)",
  gain: "var(--gain)",
  loss: "var(--loss)",
  muted: "var(--subtle-foreground)",
} as const;

/**
 * Compact trend line — no axes, no gridlines, no interaction (that is a full
 * chart; those follow docs/design-system.md § Charts and the data-viz procedure
 * in TASK-10+). 2px stroke, 8px end marker anchored to the plotted point.
 */
export function Sparkline({
  data,
  width = 96,
  height = 28,
  tone = "auto",
  showEndPoint = true,
  className,
  "aria-label": ariaLabel,
}: SparklineProps) {
  if (data.length < 2) return null;

  const first = data[0] ?? 0;
  const last = data[data.length - 1] ?? 0;
  const resolvedTone =
    tone === "auto"
      ? last > first
        ? "gain"
        : last < first
          ? "loss"
          : "muted"
      : tone;
  const stroke = TONE_VAR[resolvedTone];

  const min = Math.min(...data);
  const max = Math.max(...data);
  const span = max - min || 1;
  const pad = 3;
  const innerW = width - pad * 2;
  const innerH = height - pad * 2;

  const points = data.map((v, i) => {
    const x = pad + (i / (data.length - 1)) * innerW;
    const y = pad + innerH - ((v - min) / span) * innerH;
    return [x, y] as const;
  });
  const d = points
    .map(([x, y], i) => `${i === 0 ? "M" : "L"}${x} ${y}`)
    .join(" ");
  const end = points[points.length - 1];

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      role="img"
      aria-label={ariaLabel ?? `Trend, ${resolvedTone}`}
      className={cn("overflow-visible", className)}
    >
      <path
        d={d}
        fill="none"
        stroke={stroke}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
      {showEndPoint && end && (
        <circle cx={end[0]} cy={end[1]} r={2.5} fill={stroke} />
      )}
    </svg>
  );
}
