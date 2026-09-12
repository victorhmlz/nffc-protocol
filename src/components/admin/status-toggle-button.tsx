"use client";

import type { useWriteContract } from "wagmi";
import { Button } from "@/components/ui/button";
import { ErrorNotice } from "@/components/ui/error-notice";
import { TransactionStatus } from "@/components/ui/transaction-status";
import { useWriteFlow } from "@/lib/wallet/use-write-flow";

type WriteContractParams = Parameters<ReturnType<typeof useWriteContract>["writeContract"]>[0];

export interface StatusToggleButtonProps {
  readonly label: string;
  readonly isActive: boolean;
  readonly simulate: () => Promise<void>;
  readonly buildCall: () => WriteContractParams;
}

/**
 * Activate/deactivate toggle, reused by both `/admin/assets` and
 * `/admin/representations` (`setAssetStatus` / `setRepresentationStatus`,
 * both `REGISTRY_ADMIN_ROLE`-only) — one component instead of two
 * near-duplicates, the same discipline this codebase has applied to every
 * shared row-action shape since TASK-20/25/27.
 */
export function StatusToggleButton({ label, isActive, simulate, buildCall }: StatusToggleButtonProps) {
  const flow = useWriteFlow({ simulate, buildCall });

  return (
    <div className="flex flex-col items-end gap-1">
      {flow.isSimulating ? (
        <p role="status" aria-live="polite" className="text-xs text-muted-foreground">
          Simulating…
        </p>
      ) : (
        flow.state !== "idle" && <TransactionStatus state={flow.state} />
      )}
      {flow.errorCode && <ErrorNotice code={flow.errorCode} />}
      <Button
        type="button"
        size="sm"
        variant={isActive ? "outline" : "primary"}
        onClick={flow.execute}
        disabled={flow.isSimulating || (flow.state !== "idle" && flow.state !== "failed" && flow.state !== "rejected")}
        aria-label={isActive ? `Deactivate ${label}` : `Activate ${label}`}
      >
        {isActive ? "Deactivate" : "Activate"}
      </Button>
    </div>
  );
}
