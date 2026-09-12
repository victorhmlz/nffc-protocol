"use client";

import { useState } from "react";
import type { useWriteContract } from "wagmi";
import { Button, Field, FieldControl, FieldLabel, Input, Select } from "@/components/ui";
import { TransactionStatus } from "@/components/ui/transaction-status";
import { useWriteFlow } from "@/lib/wallet/use-write-flow";

type WriteContractParams = Parameters<ReturnType<typeof useWriteContract>["writeContract"]>[0];

// No deployed AssetIdentityRegistry yet (TASK-36) — same honest,
// wallet-never-engaged fixture pattern every other write in this codebase
// uses; REGISTRY_ADMIN_ROLE-only in the real contract.
function simulateRegisterAssetFixture(): Promise<void> {
  return Promise.reject(
    new Error("AssetIdentityRegistry is not deployed yet (TASK-36) — registering an asset is unavailable."),
  );
}
function buildRegisterAssetCallFixture(): WriteContractParams {
  throw new Error("unreachable — simulateRegisterAssetFixture always rejects until deployed (TASK-36)");
}

/** `AssetIdentityRegistry.registerAssetIdentity(symbol, name, assetClass)` (TASK-05). */
export function RegisterAssetForm() {
  const [symbol, setSymbol] = useState("");
  const [name, setName] = useState("");
  const [assetClass, setAssetClass] = useState<"EQUITY" | "CRYPTO">("EQUITY");
  const flow = useWriteFlow({ simulate: simulateRegisterAssetFixture, buildCall: buildRegisterAssetCallFixture });

  return (
    <form
      className="flex flex-wrap items-end gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        flow.execute();
      }}
    >
      <Field className="w-32">
        <FieldLabel>Symbol</FieldLabel>
        <FieldControl>
          <Input value={symbol} onChange={(e) => setSymbol(e.target.value)} placeholder="NVDA" required />
        </FieldControl>
      </Field>
      <Field className="w-56">
        <FieldLabel>Name</FieldLabel>
        <FieldControl>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="NVIDIA Corporation" required />
        </FieldControl>
      </Field>
      <Field className="w-32">
        <FieldLabel>Class</FieldLabel>
        <FieldControl>
          <Select value={assetClass} onChange={(e) => setAssetClass(e.target.value as "EQUITY" | "CRYPTO")}>
            <option value="EQUITY">Equity</option>
            <option value="CRYPTO">Crypto</option>
          </Select>
        </FieldControl>
      </Field>
      <Button
        type="submit"
        size="sm"
        disabled={
          flow.isSimulating ||
          !symbol ||
          !name ||
          (flow.state !== "idle" && flow.state !== "failed" && flow.state !== "rejected")
        }
      >
        Register asset
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
