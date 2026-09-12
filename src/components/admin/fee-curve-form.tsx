"use client";

import { useState } from "react";
import type { useWriteContract } from "wagmi";
import { Button, ErrorNotice, Field, FieldControl, FieldLabel, Input } from "@/components/ui";
import { TransactionStatus } from "@/components/ui/transaction-status";
import { useWriteFlow } from "@/lib/wallet/use-write-flow";
import type { FeeCurve } from "@/lib/admin/types";

type WriteContractParams = Parameters<ReturnType<typeof useWriteContract>["writeContract"]>[0];

export type FeeCurveKind = "collection" | "mint";

const CURVE_META: Record<FeeCurveKind, { label: string; action: string }> = {
  collection: { label: "Collection creation fee", action: "setting the collection creation fee curve" },
  mint: { label: "Mint fee", action: "setting the mint fee curve" },
};

export interface FeeCurveFormProps {
  readonly kind: FeeCurveKind;
  readonly current: FeeCurve;
}

// No deployed FeeConfig yet (TASK-36) — same honest fixture pattern every
// write in this codebase uses; FEE_ADMIN_ROLE-only in the real contract.
function simulateSetCurveFixture(kind: FeeCurveKind): () => Promise<void> {
  return () => Promise.reject(new Error(`FeeConfig is not deployed yet (TASK-36) — ${CURVE_META[kind].action} is unavailable.`));
}
function buildSetCurveCallFixture(): WriteContractParams {
  throw new Error("unreachable — simulateSetCurveFixture always rejects until deployed (TASK-36)");
}

/**
 * `FeeConfig.setCollectionFeeParams` / `setMintFeeParams` (TASK-30) — one
 * generic form, reused for both curves (`base + slope * (n - 1)`,
 * `docs/fee-engine.md`), rather than two near-duplicates. `kind` only
 * selects the label and the honest fixture's error text — a real
 * implementation would use it to pick which setter to encode `buildCall`
 * for.
 */
export function FeeCurveForm({ kind, current }: FeeCurveFormProps) {
  const [base, setBase] = useState(String(current.base));
  const [slope, setSlope] = useState(String(current.slope));
  const flow = useWriteFlow({ simulate: simulateSetCurveFixture(kind), buildCall: buildSetCurveCallFixture });

  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        flow.execute();
      }}
    >
      <h3 className="text-sm font-semibold tracking-tight">{CURVE_META[kind].label}</h3>
      <div className="flex flex-wrap items-end gap-3">
        <Field className="w-40">
          <FieldLabel>Base (wei)</FieldLabel>
          <FieldControl>
            <Input value={base} onChange={(e) => setBase(e.target.value)} required />
          </FieldControl>
        </Field>
        <Field className="w-40">
          <FieldLabel>Slope (wei)</FieldLabel>
          <FieldControl>
            <Input value={slope} onChange={(e) => setSlope(e.target.value)} required />
          </FieldControl>
        </Field>
        <Button
          type="submit"
          size="sm"
          disabled={flow.isSimulating || (flow.state !== "idle" && flow.state !== "failed" && flow.state !== "rejected")}
        >
          Update curve
        </Button>
      </div>
      {flow.isSimulating ? (
        <p role="status" aria-live="polite" className="text-xs text-muted-foreground">
          Simulating…
        </p>
      ) : (
        flow.state !== "idle" && <TransactionStatus state={flow.state} />
      )}
      {flow.errorCode && <ErrorNotice code={flow.errorCode} />}
    </form>
  );
}
