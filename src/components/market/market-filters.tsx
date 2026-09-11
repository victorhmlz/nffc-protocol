"use client";

import { useRouter, useSearchParams } from "next/navigation";
import type { CompositionSegment } from "@domain/nffc/composition";
import type { MintConditionRegime } from "@domain/mint-condition/mint-condition";
import { Field, FieldControl, FieldLabel, Select } from "@/components/ui";

const SEGMENT_OPTIONS: { value: CompositionSegment | ""; label: string }[] = [
  { value: "", label: "All segments" },
  { value: "CRYPTO_ONLY", label: "Crypto-only" },
  { value: "STOCK_ONLY", label: "Stock-only" },
  { value: "MIXED", label: "Mixed" },
];

const RARITY_OPTIONS = [
  { value: "", label: "Any rarity" },
  { value: "0.25", label: "25%+" },
  { value: "0.5", label: "50%+" },
  { value: "0.75", label: "75%+" },
  { value: "0.9", label: "90%+" },
];

const REGIME_OPTIONS: { value: MintConditionRegime; label: string }[] = [
  { value: "at-highs", label: "At highs" },
  { value: "near-highs", label: "Near highs" },
  { value: "mid", label: "Mid-drawdown" },
  { value: "deep-drawdown", label: "Deep drawdown" },
];

const SORT_OPTIONS = [
  { value: "newest", label: "Newest" },
  { value: "price_asc", label: "Price: low to high" },
  { value: "price_desc", label: "Price: high to low" },
  { value: "rarity_desc", label: "Rarity: highest first" },
];

/**
 * Explore filters (TASK-20 acceptance: segment, rarity, mint condition — over
 * indexed data, never a per-item on-chain read; see
 * `domain/marketplace/listings.ts`). A Client Component so it can read/write
 * the URL, but it holds no filter state of its own — the URL (parsed
 * server-side by `parseMarketplaceSearchParams`) is the single source of
 * truth, so a shared/bookmarked link reproduces the exact same results
 * (`docs/marketplace-ui.md`).
 */
export function MarketFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();

  function setParam(name: string, value: string | null): void {
    const next = new URLSearchParams(searchParams.toString());
    if (value === null || value === "") next.delete(name);
    else next.set(name, value);
    next.delete("page"); // any filter/sort change starts back at page 1
    router.push(`/market?${next.toString()}`);
  }

  function toggleRegime(regime: MintConditionRegime, checked: boolean): void {
    const current = new Set(searchParams.getAll("regime"));
    if (checked) current.add(regime);
    else current.delete(regime);
    const next = new URLSearchParams(searchParams.toString());
    next.delete("regime");
    for (const r of current) next.append("regime", r);
    next.delete("page");
    router.push(`/market?${next.toString()}`);
  }

  const activeRegimes = new Set(searchParams.getAll("regime"));

  return (
    <form
      aria-label="Filter and sort NFFCs"
      className="flex flex-wrap items-end gap-4 rounded-lg border border-border bg-surface p-4"
    >
      <Field className="w-40">
        <FieldLabel>Segment</FieldLabel>
        <FieldControl>
          <Select
            value={searchParams.get("segment") ?? ""}
            onChange={(e) => setParam("segment", e.target.value)}
          >
            {SEGMENT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </FieldControl>
      </Field>

      <Field className="w-36">
        <FieldLabel>Static rarity</FieldLabel>
        <FieldControl>
          <Select
            value={searchParams.get("minRarity") ?? ""}
            onChange={(e) => setParam("minRarity", e.target.value)}
          >
            {RARITY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </FieldControl>
      </Field>

      <fieldset className="flex flex-col gap-1.5">
        <legend className="text-xs font-medium text-subtle-foreground">Mint condition</legend>
        <div className="flex flex-wrap gap-3">
          {REGIME_OPTIONS.map((o) => (
            <label key={o.value} className="flex items-center gap-1.5 text-sm text-foreground">
              <input
                type="checkbox"
                checked={activeRegimes.has(o.value)}
                onChange={(e) => toggleRegime(o.value, e.target.checked)}
                className="size-4 rounded-sm border-input"
              />
              {o.label}
            </label>
          ))}
        </div>
      </fieldset>

      <label className="flex items-center gap-1.5 text-sm text-foreground">
        <input
          type="checkbox"
          checked={searchParams.get("listed") === "1"}
          onChange={(e) => setParam("listed", e.target.checked ? "1" : null)}
          className="size-4 rounded-sm border-input"
        />
        Listed only
      </label>

      <Field className="ml-auto w-48">
        <FieldLabel>Sort</FieldLabel>
        <FieldControl>
          <Select value={searchParams.get("sort") ?? "newest"} onChange={(e) => setParam("sort", e.target.value)}>
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </FieldControl>
      </Field>
    </form>
  );
}
