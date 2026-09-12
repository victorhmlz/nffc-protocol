"use client";

import { useState } from "react";
import type { useWriteContract } from "wagmi";
import type { AssetIdentity } from "@domain/registry/types";
import { Button, Field, FieldControl, FieldLabel, Input, Select } from "@/components/ui";
import { TransactionStatus } from "@/components/ui/transaction-status";
import { useWriteFlow } from "@/lib/wallet/use-write-flow";

type WriteContractParams = Parameters<ReturnType<typeof useWriteContract>["writeContract"]>[0];

// No deployed RepresentationRegistry yet (TASK-36) — same honest,
// wallet-never-engaged fixture pattern; REGISTRY_ADMIN_ROLE (or the
// provider's own adapter) in the real contract.
function simulateRegisterRepresentationFixture(): Promise<void> {
  return Promise.reject(
    new Error("RepresentationRegistry is not deployed yet (TASK-36) — registering a representation is unavailable."),
  );
}
function buildRegisterRepresentationCallFixture(): WriteContractParams {
  throw new Error("unreachable — simulateRegisterRepresentationFixture always rejects until deployed (TASK-36)");
}

export interface RegisterRepresentationFormProps {
  readonly assets: readonly AssetIdentity[];
}

/** `RepresentationRegistry.registerRepresentation(RegisterParams)` (TASK-05)
 *  — the oracle fields (`heartbeat`, `feedDecimals`) use the same defaults
 *  `ChainlinkPriceOracle` (TASK-22) already assumes elsewhere in this
 *  codebase; updating them after registration is `updateOracleMetadata`, a
 *  separate admin action not built in this TASK — see KNOWN ISSUES,
 *  `docs/reports/TASK-31-REPORT.md`. */
export function RegisterRepresentationForm({ assets }: RegisterRepresentationFormProps) {
  const [assetId, setAssetId] = useState(assets[0]?.assetId ?? "");
  const [token, setToken] = useState("");
  const [decimals, setDecimals] = useState("18");
  const flow = useWriteFlow({
    simulate: simulateRegisterRepresentationFixture,
    buildCall: buildRegisterRepresentationCallFixture,
  });

  return (
    <form
      className="flex flex-wrap items-end gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        flow.execute();
      }}
    >
      <Field className="w-40">
        <FieldLabel>Asset</FieldLabel>
        <FieldControl>
          <Select value={assetId} onChange={(e) => setAssetId(e.target.value)}>
            {assets.map((a) => (
              <option key={a.assetId} value={a.assetId}>
                {a.symbol}
              </option>
            ))}
          </Select>
        </FieldControl>
      </Field>
      <Field className="w-64">
        <FieldLabel>Token address</FieldLabel>
        <FieldControl>
          <Input value={token} onChange={(e) => setToken(e.target.value)} placeholder="0x…" required />
        </FieldControl>
      </Field>
      <Field className="w-24">
        <FieldLabel>Decimals</FieldLabel>
        <FieldControl>
          <Input
            type="number"
            min="0"
            max="255"
            value={decimals}
            onChange={(e) => setDecimals(e.target.value)}
            required
          />
        </FieldControl>
      </Field>
      <Button
        type="submit"
        size="sm"
        disabled={
          flow.isSimulating ||
          !token ||
          (flow.state !== "idle" && flow.state !== "failed" && flow.state !== "rejected")
        }
      >
        Register representation
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
