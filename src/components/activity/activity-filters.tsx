"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { ActivityKind } from "@domain/nffc-detail/detail";
import { Button, Field, FieldControl, FieldLabel, Input } from "@/components/ui";

const KIND_OPTIONS: { value: ActivityKind; label: string }[] = [
  { value: "MINT", label: "Minted" },
  { value: "TRANSFER", label: "Transferred" },
  { value: "LISTING_CREATED", label: "Listed" },
  { value: "LISTING_CANCELLED", label: "Listing cancelled" },
  { value: "SALE", label: "Sold" },
  { value: "OFFER_CREATED", label: "Offer made" },
  { value: "OFFER_ACCEPTED", label: "Offer accepted" },
  { value: "OFFER_CANCELLED", label: "Offer cancelled" },
];

/**
 * Global feed filters (TASK-26): wallet, NFFC, and kind — over indexed data,
 * never a per-item on-chain read (same acceptance property `MarketFilters`,
 * TASK-20, established). A Client Component so it can read/write the URL,
 * but holds no filter state of its own beyond the two text inputs' live
 * value while typing — the URL (parsed server-side by
 * `parseActivitySearchParams`) is the single source of truth once submitted,
 * so a shared/bookmarked link reproduces the exact same results.
 */
export function ActivityFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [wallet, setWallet] = useState(searchParams.get("wallet") ?? "");
  const [tokenId, setTokenId] = useState(searchParams.get("tokenId") ?? "");

  function applyTextFilters(): void {
    const next = new URLSearchParams(searchParams.toString());
    if (wallet.trim()) next.set("wallet", wallet.trim());
    else next.delete("wallet");
    if (tokenId.trim()) next.set("tokenId", tokenId.trim());
    else next.delete("tokenId");
    next.delete("page");
    router.push(`/activity?${next.toString()}`);
  }

  function toggleKind(kind: ActivityKind, checked: boolean): void {
    const current = new Set(searchParams.getAll("kind"));
    if (checked) current.add(kind);
    else current.delete(kind);
    const next = new URLSearchParams(searchParams.toString());
    next.delete("kind");
    for (const k of current) next.append("kind", k);
    next.delete("page");
    router.push(`/activity?${next.toString()}`);
  }

  const activeKinds = new Set(searchParams.getAll("kind"));

  return (
    <form
      aria-label="Filter activity"
      className="flex flex-wrap items-end gap-4 rounded-lg border border-border bg-surface p-4"
      onSubmit={(e) => {
        e.preventDefault();
        applyTextFilters();
      }}
    >
      <Field className="w-48">
        <FieldLabel>Wallet</FieldLabel>
        <FieldControl>
          <Input
            value={wallet}
            onChange={(e) => setWallet(e.target.value)}
            placeholder="0x…"
          />
        </FieldControl>
      </Field>

      <Field className="w-32">
        <FieldLabel>NFFC #</FieldLabel>
        <FieldControl>
          <Input value={tokenId} onChange={(e) => setTokenId(e.target.value)} placeholder="e.g. 7" />
        </FieldControl>
      </Field>

      <Button type="submit" variant="outline" size="sm">
        Apply
      </Button>

      <fieldset className="flex flex-col gap-1.5">
        <legend className="text-xs font-medium text-subtle-foreground">Kind</legend>
        <div className="flex flex-wrap gap-3">
          {KIND_OPTIONS.map((o) => (
            <label key={o.value} className="flex items-center gap-1.5 text-sm text-foreground">
              <input
                type="checkbox"
                checked={activeKinds.has(o.value)}
                onChange={(e) => toggleKind(o.value, e.target.checked)}
                className="size-4 rounded-sm border-input"
              />
              {o.label}
            </label>
          ))}
        </div>
      </fieldset>
    </form>
  );
}
