import { Stat } from "@/components/ui/stat";
import { cn } from "@/lib/cn";

export interface StaticRarityStatProps {
  /** `staticRarityScore(weights)` from `@domain/rarity` — `[0, 1]`, higher = rarer. */
  readonly score: number;
  readonly className?: string;
}

/**
 * Static (birth) rarity — structural, derived from the composition, never
 * user-set (TASK-14). No oracle involved, so no timestamp/source is shown —
 * the on-chain composition it is computed from is itself the provenance.
 */
export function StaticRarityStat({ score, className }: StaticRarityStatProps) {
  return (
    <Stat
      label="Static Rarity"
      value={Math.round(score * 100)}
      hint="From composition concentration — structural, not market data"
      className={cn(className)}
      aligned
    />
  );
}
