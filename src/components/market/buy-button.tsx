"use client";

import type { useWriteContract } from "wagmi";
import { Button } from "@/components/ui/button";
import { ErrorNotice } from "@/components/ui/error-notice";
import { TransactionStatus } from "@/components/ui/transaction-status";
import { useWriteFlow } from "@/lib/wallet/use-write-flow";

type WriteContractParams = Parameters<ReturnType<typeof useWriteContract>["writeContract"]>[0];

export interface BuyButtonProps {
  readonly tokenId: string;
  /** Wei, as a decimal string — see `IndexedListing.priceWei`. */
  readonly priceWei: string;
}

// Marketplace has no deployed address yet (TASK-36) — every simulation fails,
// which is the honest, live demonstration of the same acceptance property
// TASK-18 established for mint: the wallet is never engaged (buildBuyCall
// below is provably unreachable here). Functions are defined inside this
// Client Component (not injected via props from the Server Component page)
// because a function cannot cross the server/client RSC boundary — only
// serializable values (`tokenId`, `priceWei`) do.
function simulateBuyFixture(): Promise<void> {
  return Promise.reject(new Error("Marketplace is not deployed yet (TASK-36) — buying is unavailable."));
}

function buildBuyCallFixture(): WriteContractParams {
  throw new Error("unreachable — simulateBuyFixture always rejects until Marketplace is deployed (TASK-36)");
}

/**
 * Buy affordance for a listed NFFC card (TASK-20) — simulate → sign → submit
 * → confirm, driven by the same `TransactionStatus` widget the mint flow uses
 * (`transaction-status.tsx`: "Drop-in for the mint / buy / offer flows").
 */
export function BuyButton({ tokenId, priceWei }: BuyButtonProps) {
  const flow = useWriteFlow({ simulate: simulateBuyFixture, buildCall: buildBuyCallFixture });

  return (
    <div className="flex flex-col gap-2">
      {flow.isSimulating ? (
        <p role="status" aria-live="polite" className="text-xs text-muted-foreground">
          Simulating the purchase…
        </p>
      ) : (
        flow.state !== "idle" && <TransactionStatus state={flow.state} />
      )}
      {flow.errorCode && <ErrorNotice code={flow.errorCode} />}
      <Button
        type="button"
        size="sm"
        onClick={flow.execute}
        disabled={flow.isSimulating || (flow.state !== "idle" && flow.state !== "failed" && flow.state !== "rejected")}
        aria-label={`Buy NFFC #${tokenId} for ${priceWei} wei`}
      >
        Buy
      </Button>
    </div>
  );
}
