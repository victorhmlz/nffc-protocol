"use client";

import { useState } from "react";
import type { useWriteContract } from "wagmi";
import { Button, Field, FieldControl, FieldLabel, Input } from "@/components/ui";
import { TransactionStatus } from "@/components/ui/transaction-status";
import { useWriteFlow } from "@/lib/wallet/use-write-flow";

type WriteContractParams = Parameters<ReturnType<typeof useWriteContract>["writeContract"]>[0];

export interface MarketplaceFeeFormProps {
  readonly currentBps: number;
}

// No deployed FeeConfig yet (TASK-36) — same honest fixture pattern every
// write in this codebase uses; FEE_ADMIN_ROLE-only in the real contract.
function simulateSetMarketplaceFeeFixture(): Promise<void> {
  return Promise.reject(new Error("FeeConfig is not deployed yet (TASK-36) — updating the marketplace fee is unavailable."));
}
function buildSetMarketplaceFeeCallFixture(): WriteContractParams {
  throw new Error("unreachable — simulateSetMarketplaceFeeFixture always rejects until deployed (TASK-36)");
}

/** `FeeConfig.setMarketplaceFeeBps` (TASK-30) — capped at `MAX_MARKETPLACE_FEE_BPS`
 *  (1000 = 10%) on-chain; this form doesn't duplicate that cap client-side,
 *  it just shows whatever the (fixture, here) simulation honestly reports. */
export function MarketplaceFeeForm({ currentBps }: MarketplaceFeeFormProps) {
  const [bps, setBps] = useState(String(currentBps));
  const flow = useWriteFlow({ simulate: simulateSetMarketplaceFeeFixture, buildCall: buildSetMarketplaceFeeCallFixture });

  return (
    <form
      className="flex flex-wrap items-end gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        flow.execute();
      }}
    >
      <Field className="w-32">
        <FieldLabel>Marketplace fee (bps)</FieldLabel>
        <FieldControl>
          <Input type="number" min="0" value={bps} onChange={(e) => setBps(e.target.value)} required />
        </FieldControl>
      </Field>
      <Button
        type="submit"
        size="sm"
        disabled={flow.isSimulating || (flow.state !== "idle" && flow.state !== "failed" && flow.state !== "rejected")}
      >
        Update
      </Button>
      {flow.isSimulating ? (
        <p role="status" aria-live="polite" className="text-xs text-muted-foreground">
          Simulating…
        </p>
      ) : (
        flow.state !== "idle" && <TransactionStatus state={flow.state} />
      )}
      {flow.error && (
        <p role="alert" className="text-xs text-loss">
          {flow.error}
        </p>
      )}
    </form>
  );
}
