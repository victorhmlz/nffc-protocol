"use client";

import { useState } from "react";
import type { useWriteContract } from "wagmi";
import { Button, ErrorNotice, Field, FieldControl, FieldLabel, Input, Select } from "@/components/ui";
import { TransactionStatus } from "@/components/ui/transaction-status";
import { useWriteFlow } from "@/lib/wallet/use-write-flow";

type WriteContractParams = Parameters<ReturnType<typeof useWriteContract>["writeContract"]>[0];

export interface MakeOfferFormProps {
  readonly tokenId: string;
}

const DURATION_OPTIONS = [
  { seconds: 86_400, label: "1 day" },
  { seconds: 259_200, label: "3 days" },
  { seconds: 604_800, label: "7 days" },
  { seconds: 2_592_000, label: "30 days" },
] as const;

// Marketplace.sol.createOffer(tokenId, expiry) is payable — price is
// msg.value, not a separate argument (contracts/Marketplace.sol). No deployed
// address yet (TASK-36), so every simulation fails, the same honest, live
// demonstration BuyButton (TASK-20) established: the wallet is never engaged.
function simulateMakeOfferFixture(): Promise<void> {
  return Promise.reject(new Error("Marketplace is not deployed yet (TASK-36) — making an offer is unavailable."));
}

function buildMakeOfferCallFixture(): WriteContractParams {
  throw new Error("unreachable — simulateMakeOfferFixture always rejects until Marketplace is deployed (TASK-36)");
}

/**
 * Create-offer form (TASK-29) — price + expiry, then the same
 * simulate → sign → submit → confirm flow every other marketplace write
 * uses (`useWriteFlow`). Lives inside `OffersList` rather than a
 * separate card — offers are one concept (view existing + make a new one),
 * the same way `ListingCard` combines viewing a listing with buying it.
 */
export function MakeOfferForm({ tokenId }: MakeOfferFormProps) {
  const [priceEth, setPriceEth] = useState("");
  const [durationSeconds, setDurationSeconds] = useState<number>(DURATION_OPTIONS[0].seconds);
  const flow = useWriteFlow({
    simulate: simulateMakeOfferFixture,
    buildCall: buildMakeOfferCallFixture,
  });

  return (
    <form
      className="flex flex-col gap-3 border-t border-border pt-4"
      onSubmit={(e) => {
        e.preventDefault();
        flow.execute();
      }}
    >
      <div className="flex flex-wrap gap-3">
        <Field className="flex-1">
          <FieldLabel>Offer price (ETH)</FieldLabel>
          <FieldControl>
            <Input
              type="number"
              inputMode="decimal"
              min="0"
              step="0.0001"
              value={priceEth}
              onChange={(e) => setPriceEth(e.target.value)}
              placeholder="0.5"
              required
            />
          </FieldControl>
        </Field>
        <Field className="w-32">
          <FieldLabel>Expires in</FieldLabel>
          <FieldControl>
            <Select
              value={durationSeconds}
              onChange={(e) => setDurationSeconds(Number(e.target.value))}
            >
              {DURATION_OPTIONS.map((o) => (
                <option key={o.seconds} value={o.seconds}>
                  {o.label}
                </option>
              ))}
            </Select>
          </FieldControl>
        </Field>
      </div>
      {flow.isSimulating ? (
        <p role="status" aria-live="polite" className="text-xs text-muted-foreground">
          Simulating the offer…
        </p>
      ) : (
        flow.state !== "idle" && <TransactionStatus state={flow.state} />
      )}
      {flow.errorCode && <ErrorNotice code={flow.errorCode} />}
      <Button
        type="submit"
        size="sm"
        disabled={
          flow.isSimulating ||
          !priceEth ||
          (flow.state !== "idle" && flow.state !== "failed" && flow.state !== "rejected")
        }
        aria-label={`Make an offer on NFFC #${tokenId}`}
      >
        Make offer
      </Button>
    </form>
  );
}
