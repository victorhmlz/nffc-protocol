import { BPS_TOTAL } from "@domain/nffc/composition";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { RepresentationId } from "@domain/registry/types";
import type { WizardComponentDraft } from "@/lib/wizard/wizard-state";

export interface StepWeightsProps {
  readonly components: readonly WizardComponentDraft[];
  readonly onSetWeight: (
    representationId: RepresentationId,
    weightBps: number,
  ) => void;
  readonly onNext: () => void;
}

export function StepWeights({
  components,
  onSetWeight,
  onNext,
}: StepWeightsProps) {
  const sum = components.reduce((s, c) => s + c.weightBps, 0);
  const duplicateAssetIds = new Set(
    components
      .map((c) => c.assetId)
      .filter((assetId, i, arr) => arr.indexOf(assetId) !== i),
  );

  return (
    <div className="flex flex-col gap-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Asset</TableHead>
            <TableHead numeric>Weight (bps)</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {components.map((c) => (
            <TableRow key={c.representationId}>
              <TableCell>
                {c.assetSymbol}
                {duplicateAssetIds.has(c.assetId) && (
                  <Badge variant="loss" className="ml-2">
                    Duplicate
                  </Badge>
                )}
                {c.weightBps <= 0 && (
                  <Badge variant="warning" className="ml-2">
                    Zero weight
                  </Badge>
                )}
              </TableCell>
              <TableCell numeric>
                <Input
                  type="number"
                  min={0}
                  max={BPS_TOTAL}
                  value={c.weightBps}
                  onChange={(e) =>
                    onSetWeight(c.representationId, Number(e.target.value))
                  }
                  className="w-28 text-right font-mono tabular-nums"
                  aria-label={`Weight for ${c.assetSymbol}, in basis points`}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <p className="tabular text-sm" aria-live="polite">
        Total:{" "}
        <span className="font-mono font-semibold">{sum.toLocaleString()}</span>{" "}
        / {BPS_TOTAL.toLocaleString()} bps
        {sum === BPS_TOTAL ? (
          <Badge variant="gain" className="ml-2">
            Balanced
          </Badge>
        ) : (
          <Badge variant="warning" className="ml-2">
            {sum > BPS_TOTAL ? "Over" : "Under"} by{" "}
            {Math.abs(BPS_TOTAL - sum).toLocaleString()}
          </Badge>
        )}
      </p>
      <Button type="button" onClick={onNext} className="self-start">
        Continue to validation
      </Button>
    </div>
  );
}
