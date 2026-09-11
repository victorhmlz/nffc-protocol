import { deriveSegment } from "@domain/nffc/segment";
import { staticRarityScore } from "@domain/rarity/rarity";
import type { StaticComponentFact } from "@domain/metadata/metadata";
import { Button } from "@/components/ui/button";
import { CompositionTable } from "@/components/ui/composition-table";
import { NffcArt } from "@/components/ui/nffc-art";
import { GeoEligibilityNotice, SegmentBadge } from "@/components/ui/segment-badge";
import { StaticRarityStat } from "@/components/ui/static-rarity-stat";
import { computeCompositionHash } from "@/lib/wizard/composition-hash";
import type { WizardComponentDraft } from "@/lib/wizard/wizard-state";

export interface StepPreviewProps {
  readonly components: readonly WizardComponentDraft[];
  readonly onNext: () => void;
}

/**
 * The exact post-mint preview (TASK-17 acceptance): the art seed is
 * `computeCompositionHash(components)` — byte-identical to
 * `NFFC.getCompositionHash(tokenId)` once minted, over the same components in
 * the same order — so `NffcArt` renders precisely what the token will show.
 */
export function StepPreview({ components, onNext }: StepPreviewProps) {
  const seed = computeCompositionHash(components);
  const segment = deriveSegment(
    components.map((c) => c.assetClass === "CRYPTO"),
  );
  const score = staticRarityScore(components.map((c) => c.weightBps));

  const facts: StaticComponentFact[] = components.map((c, position) => ({
    position,
    assetId: c.assetId,
    assetSymbol: c.assetSymbol,
    assetClass: c.assetClass,
    providerId: c.providerId,
    representationId: c.representationId,
    weightBps: c.weightBps,
  }));

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-6 sm:grid-cols-2">
        <NffcArt
          input={{
            seed,
            components: components.map((c) => ({
              assetId: c.assetId,
              weightBps: c.weightBps,
            })),
          }}
          className="aspect-square"
          label="Generative art preview — matches the post-mint result exactly"
        />
        <div className="flex flex-col gap-4">
          <SegmentBadge segment={segment} />
          {/* TASK-08 acceptance: the UI must clearly communicate the
              geographic-eligibility difference wherever a segment is shown —
              wired here (and in NffcCard) as of the TASK-20 review; see
              docs/reports/TASK-08-REPORT.md's correction note. */}
          <GeoEligibilityNotice segment={segment} />
          <StaticRarityStat score={score} />
          <CompositionTable components={facts} />
        </div>
      </div>
      <Button type="button" onClick={onNext} className="self-start">
        Continue to fees
      </Button>
    </div>
  );
}
