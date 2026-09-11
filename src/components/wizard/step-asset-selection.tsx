import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { AvailableAsset } from "@/lib/wizard/types";
import type { WizardComponentDraft } from "@/lib/wizard/wizard-state";

export interface StepAssetSelectionProps {
  /** Every registered, active representation — Stock Tokens and native crypto
   *  together, one list. No provider-specific tab or sub-flow. */
  readonly availableAssets: readonly AvailableAsset[];
  readonly selected: readonly WizardComponentDraft[];
  readonly onAdd: (asset: AvailableAsset) => void;
  readonly onRemove: (
    representationId: AvailableAsset["representationId"],
  ) => void;
  readonly onNext: () => void;
  readonly canAdvance: boolean;
}

export function StepAssetSelection({
  availableAssets,
  selected,
  onAdd,
  onRemove,
  onNext,
  canAdvance,
}: StepAssetSelectionProps) {
  const selectedIds = new Set(selected.map((c) => c.representationId));

  return (
    <div className="flex flex-col gap-4">
      <p className="max-w-prose text-sm text-subtle-foreground">
        Stock Tokens and native crypto, one list — pick any mix. Only
        registered, active representations are selectable; there is no address
        field.
      </p>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Asset</TableHead>
            <TableHead>Provider</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {availableAssets.map((asset) => {
            const isSelected = selectedIds.has(asset.representationId);
            return (
              <TableRow key={asset.representationId}>
                <TableCell>
                  <span className="font-medium">{asset.assetSymbol}</span>{" "}
                  <span className="text-xs text-subtle-foreground">
                    {asset.assetName}
                  </span>
                </TableCell>
                <TableCell>
                  <Badge
                    variant={
                      asset.assetClass === "CRYPTO" ? "primary" : "outline"
                    }
                  >
                    {asset.providerId}
                  </Badge>
                </TableCell>
                <TableCell numeric>
                  <Button
                    type="button"
                    size="sm"
                    variant={isSelected ? "secondary" : "primary"}
                    onClick={() =>
                      isSelected
                        ? onRemove(asset.representationId)
                        : onAdd(asset)
                    }
                  >
                    {isSelected ? "Remove" : "Add"}
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      <p className="text-sm text-muted-foreground" role="status">
        {selected.length} selected
      </p>
      <Button
        type="button"
        onClick={onNext}
        disabled={!canAdvance}
        className="self-start"
      >
        Continue
      </Button>
    </div>
  );
}
