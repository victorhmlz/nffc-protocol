"use client";

import { useState } from "react";
import type { useWriteContract } from "wagmi";
import { Button, Field, FieldControl, FieldLabel, Input } from "@/components/ui";
import { TransactionStatus } from "@/components/ui/transaction-status";
import { useWriteFlow } from "@/lib/wallet/use-write-flow";

type WriteContractParams = Parameters<ReturnType<typeof useWriteContract>["writeContract"]>[0];

export interface FeeRecipientFormProps {
  readonly currentRecipient: string;
}

// No deployed FeeConfig yet (TASK-36) — same honest fixture pattern every
// write in this codebase uses; FEE_ADMIN_ROLE-only in the real contract.
function simulateSetFeeRecipientFixture(): Promise<void> {
  return Promise.reject(new Error("FeeConfig is not deployed yet (TASK-36) — updating the fee recipient is unavailable."));
}
function buildSetFeeRecipientCallFixture(): WriteContractParams {
  throw new Error("unreachable — simulateSetFeeRecipientFixture always rejects until deployed (TASK-36)");
}

/** `FeeConfig.setFeeRecipient` (TASK-30) — rejects the zero address on-chain. */
export function FeeRecipientForm({ currentRecipient }: FeeRecipientFormProps) {
  const [recipient, setRecipient] = useState(currentRecipient);
  const flow = useWriteFlow({ simulate: simulateSetFeeRecipientFixture, buildCall: buildSetFeeRecipientCallFixture });

  return (
    <form
      className="flex flex-wrap items-end gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        flow.execute();
      }}
    >
      <Field className="w-72">
        <FieldLabel>Fee recipient</FieldLabel>
        <FieldControl>
          <Input value={recipient} onChange={(e) => setRecipient(e.target.value)} required />
        </FieldControl>
      </Field>
      <Button
        type="submit"
        size="sm"
        disabled={
          flow.isSimulating || !recipient || (flow.state !== "idle" && flow.state !== "failed" && flow.state !== "rejected")
        }
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
