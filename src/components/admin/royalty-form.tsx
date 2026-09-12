"use client";

import { useState } from "react";
import type { useWriteContract } from "wagmi";
import { Button, Field, FieldControl, FieldLabel, Input } from "@/components/ui";
import { TransactionStatus } from "@/components/ui/transaction-status";
import { useWriteFlow } from "@/lib/wallet/use-write-flow";

type WriteContractParams = Parameters<ReturnType<typeof useWriteContract>["writeContract"]>[0];

// No deployed FeeConfig yet (TASK-36) — same honest fixture pattern every
// write in this codebase uses; FEE_ADMIN_ROLE-only in the real contract.
function simulateSetRoyaltyFixture(): Promise<void> {
  return Promise.reject(new Error("FeeConfig is not deployed yet (TASK-36) — setting a royalty is unavailable."));
}
function buildSetRoyaltyCallFixture(): WriteContractParams {
  throw new Error("unreachable — simulateSetRoyaltyFixture always rejects until deployed (TASK-36)");
}

/** `FeeConfig.setRoyaltyBps(collectionId, bps)` (TASK-30) — the real contract
 *  rejects a `collectionId` that doesn't exist in `Collection.sol`
 *  (`docs/fee-engine.md`, resolves former Issue #3); this form doesn't
 *  duplicate that check client-side, it relies on the honest simulation. */
export function RoyaltyForm() {
  const [collectionId, setCollectionId] = useState("");
  const [bps, setBps] = useState("");
  const flow = useWriteFlow({ simulate: simulateSetRoyaltyFixture, buildCall: buildSetRoyaltyCallFixture });

  return (
    <form
      className="flex flex-wrap items-end gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        flow.execute();
      }}
    >
      <Field className="w-32">
        <FieldLabel>Collection ID</FieldLabel>
        <FieldControl>
          <Input value={collectionId} onChange={(e) => setCollectionId(e.target.value)} required />
        </FieldControl>
      </Field>
      <Field className="w-32">
        <FieldLabel>Royalty (bps)</FieldLabel>
        <FieldControl>
          <Input type="number" min="0" value={bps} onChange={(e) => setBps(e.target.value)} required />
        </FieldControl>
      </Field>
      <Button
        type="submit"
        size="sm"
        disabled={
          flow.isSimulating ||
          !collectionId ||
          !bps ||
          (flow.state !== "idle" && flow.state !== "failed" && flow.state !== "rejected")
        }
      >
        Set royalty
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
