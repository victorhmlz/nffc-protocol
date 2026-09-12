"use client";

import type { useWriteContract } from "wagmi";
import { useAccount } from "wagmi";
import { Button } from "@/components/ui/button";
import { TransactionStatus } from "@/components/ui/transaction-status";
import { useWriteFlow } from "@/lib/wallet/use-write-flow";

type WriteContractParams = Parameters<ReturnType<typeof useWriteContract>["writeContract"]>[0];

export interface OfferRowActionsProps {
  readonly offerId: string;
  readonly buyerAddress: string;
  readonly ownerAddress: string;
}

// No deployed Marketplace address yet (TASK-36) — same honest,
// wallet-never-engaged fixture pattern every other marketplace write in this
// codebase uses.
function simulateCancelOfferFixture(): Promise<void> {
  return Promise.reject(new Error("Marketplace is not deployed yet (TASK-36) — cancelling an offer is unavailable."));
}
function buildCancelOfferCallFixture(): WriteContractParams {
  throw new Error("unreachable — simulateCancelOfferFixture always rejects until Marketplace is deployed (TASK-36)");
}
function simulateAcceptOfferFixture(): Promise<void> {
  return Promise.reject(new Error("Marketplace is not deployed yet (TASK-36) — accepting an offer is unavailable."));
}
function buildAcceptOfferCallFixture(): WriteContractParams {
  throw new Error("unreachable — simulateAcceptOfferFixture always rejects until Marketplace is deployed (TASK-36)");
}

/**
 * The one action a given connected wallet can take on one offer row
 * (TASK-29): the offer's own buyer can **Cancel** it; the NFFC's current
 * owner can **Accept** it (`Marketplace.sol.acceptOffer` reverts on-chain if
 * `block.timestamp > expiry`, regardless of what this UI shows — the TASK-29
 * acceptance criterion). Anyone else — including a disconnected visitor —
 * sees nothing here; `OffersList`'s table itself is still visible to
 * everyone (`docs/spec/07-ux-map.md`: NFFC detail needs no wallet to view).
 *
 * Both hooks are called unconditionally (React's rules of hooks) even though
 * only one is ever used per render — which one is decided by props, not by
 * skipping a hook call.
 */
export function OfferRowActions({ offerId, buyerAddress, ownerAddress }: OfferRowActionsProps) {
  const { address, isConnected } = useAccount();
  const cancelFlow = useWriteFlow({
    simulate: simulateCancelOfferFixture,
    buildCall: buildCancelOfferCallFixture,
  });
  const acceptFlow = useWriteFlow({
    simulate: simulateAcceptOfferFixture,
    buildCall: buildAcceptOfferCallFixture,
  });

  if (!isConnected || !address) return null;

  const isBuyer = address.toLowerCase() === buyerAddress.toLowerCase();
  const isOwner = address.toLowerCase() === ownerAddress.toLowerCase();
  if (!isBuyer && !isOwner) return null;

  const flow = isOwner ? acceptFlow : cancelFlow;
  const label = isOwner ? "Accept" : "Cancel";

  return (
    <div className="flex flex-col items-end gap-1">
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
      <Button
        type="button"
        size="sm"
        variant={isOwner ? "primary" : "outline"}
        onClick={flow.execute}
        disabled={flow.isSimulating || (flow.state !== "idle" && flow.state !== "failed" && flow.state !== "rejected")}
        aria-label={`${label} offer #${offerId}`}
      >
        {label}
      </Button>
    </div>
  );
}
