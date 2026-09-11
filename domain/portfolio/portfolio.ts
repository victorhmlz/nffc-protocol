/**
 * Portfolio aggregation (TASK-25) — "NFFCs poseídos, reference value,
 * performance, exposición, colecciones" (`NFFC_Development_Plan.md` v3.2
 * TASK-24). `docs/spec/02-domain-model.md` §6 is explicit: **portfolio is a
 * view, not a stored object of record** — it's computed at read time from
 * already-indexed data, never persisted as its own table. This module is
 * that computation, pure and framework-agnostic.
 *
 * Composes two contracts TASK-25 doesn't own, rather than inventing a third,
 * near-identical "owned NFFC" shape:
 * - {@link IndexedNffcSummary} (`domain/marketplace/listings.ts`, TASK-20) —
 *   the indexer's `nffc` (+ `nffc_component`, `listing`) mirror, already
 *   carrying `ownerAddress`, `segment`, `components`, `collectionId/Name`.
 *   The same indexed table backs both `/market` (TASK-20, unfiltered) and
 *   `/portfolio` (this TASK, filtered to one owner) — one read model, two
 *   different queries over it.
 * - {@link NffcMarketSnapshot} (`domain/metadata/metadata.ts`, TASK-11,
 *   filled in by TASK-22/23) — the per-token Reference NAV + performance
 *   windows every NFFC detail page (TASK-21) already renders.
 *
 * Degraded-input policy mirrors `computeReferenceNav`'s exactly
 * (`domain/valuation/compute-reference-nav.ts`, TASK-23): a holding whose
 * snapshot is stale still contributes its last-known value; a holding with
 * no snapshot at all (`referenceNav: null`) contributes `0`. Either way the
 * portfolio's own `degraded` flag is set — nothing is silently presented as
 * a clean number when it isn't one.
 */
import type { AssetClass } from "@domain/registry/types";
import type { CompositionSegment } from "@domain/nffc/composition";
import type { IndexedNffcSummary } from "@domain/marketplace/listings";
import type { NffcMarketSnapshot } from "@domain/metadata/metadata";
import type { PerformanceWindow } from "@domain/valuation/types";
import type { UnixSeconds } from "@domain/shared/branded";

export interface PortfolioHolding {
  readonly nffc: IndexedNffcSummary;
  readonly market: NffcMarketSnapshot;
}

export interface AssetExposure {
  readonly assetId: string;
  readonly assetSymbol: string;
  readonly assetClass: AssetClass;
  readonly value: number;
  /** `[0, 1]`; `0` (never `NaN`) when the portfolio's total value is `0`. */
  readonly weightOfPortfolio: number;
}

export interface SegmentExposure {
  readonly segment: CompositionSegment;
  readonly value: number;
  readonly weightOfPortfolio: number;
  readonly holdingCount: number;
}

export interface CollectionExposure {
  readonly collectionId: string;
  readonly collectionName: string;
  readonly value: number;
  readonly weightOfPortfolio: number;
  readonly holdingCount: number;
}

export interface PortfolioPerformancePoint {
  readonly window: PerformanceWindow;
  /**
   * Value-weighted average of each contributing holding's own fractional
   * change for this window (weighted by that holding's value at the
   * window's end) — an honest, documented approximation of a portfolio
   * return, **not** a true money-weighted or time-weighted return (which
   * would need each holding's full cash-flow history, not just its own
   * before/after NAV). Same spirit as `computePerformanceWindows`'s
   * SINCE_MINT fallback (TASK-23): a reasonable proxy, not a fabricated
   * precision.
   */
  readonly change: number;
  /** How many holdings had this window available and contributed to it. */
  readonly holdingsIncluded: number;
}

export interface Portfolio {
  readonly ownerAddress: string;
  /** Newest-minted first — matches `IndexedNffcSummary`'s own on-chain order
   *  convention elsewhere in this codebase. */
  readonly holdings: readonly PortfolioHolding[];
  /** Σ of every holding's current Reference NAV (missing → `0`). */
  readonly totalReferenceValue: number;
  /** `true` if any included holding's value was stale or unavailable. */
  readonly degraded: boolean;
  /** Only windows with at least one contributing holding appear — an empty
   *  portfolio, or one with no priced holdings yet, has none. */
  readonly performance: readonly PortfolioPerformancePoint[];
  /** Sorted by `value` descending. */
  readonly exposureByAsset: readonly AssetExposure[];
  /** Sorted by `value` descending. */
  readonly exposureBySegment: readonly SegmentExposure[];
  /** Sorted by `value` descending. */
  readonly exposureByCollection: readonly CollectionExposure[];
  readonly asOf: UnixSeconds;
}

function holdingValue(holding: PortfolioHolding): number {
  return holding.market.referenceNav?.value ?? 0;
}

function weightOf(value: number, total: number): number {
  return total > 0 ? value / total : 0;
}

function sortByValueDesc<T extends { readonly value: number }>(rows: readonly T[]): readonly T[] {
  return [...rows].sort((a, b) => b.value - a.value);
}

function computeExposureByAsset(
  holdings: readonly PortfolioHolding[],
  total: number,
): readonly AssetExposure[] {
  const byAsset = new Map<string, { symbol: string; assetClass: AssetClass; value: number }>();
  for (const holding of holdings) {
    const value = holdingValue(holding);
    if (value === 0) continue;
    for (const component of holding.nffc.components) {
      const contribution = value * (component.weightBps / 10_000);
      const existing = byAsset.get(component.assetId);
      if (existing) {
        existing.value += contribution;
      } else {
        byAsset.set(component.assetId, {
          symbol: component.assetSymbol,
          assetClass: component.assetClass,
          value: contribution,
        });
      }
    }
  }
  return sortByValueDesc(
    Array.from(byAsset.entries(), ([assetId, v]) => ({
      assetId,
      assetSymbol: v.symbol,
      assetClass: v.assetClass,
      value: v.value,
      weightOfPortfolio: weightOf(v.value, total),
    })),
  );
}

function computeExposureBySegment(
  holdings: readonly PortfolioHolding[],
  total: number,
): readonly SegmentExposure[] {
  const bySegment = new Map<CompositionSegment, { value: number; count: number }>();
  for (const holding of holdings) {
    const value = holdingValue(holding);
    const existing = bySegment.get(holding.nffc.segment);
    if (existing) {
      existing.value += value;
      existing.count += 1;
    } else {
      bySegment.set(holding.nffc.segment, { value, count: 1 });
    }
  }
  return sortByValueDesc(
    Array.from(bySegment.entries(), ([segment, v]) => ({
      segment,
      value: v.value,
      weightOfPortfolio: weightOf(v.value, total),
      holdingCount: v.count,
    })),
  );
}

function computeExposureByCollection(
  holdings: readonly PortfolioHolding[],
  total: number,
): readonly CollectionExposure[] {
  const byCollection = new Map<string, { name: string; value: number; count: number }>();
  for (const holding of holdings) {
    const value = holdingValue(holding);
    const existing = byCollection.get(holding.nffc.collectionId);
    if (existing) {
      existing.value += value;
      existing.count += 1;
    } else {
      byCollection.set(holding.nffc.collectionId, {
        name: holding.nffc.collectionName,
        value,
        count: 1,
      });
    }
  }
  return sortByValueDesc(
    Array.from(byCollection.entries(), ([collectionId, v]) => ({
      collectionId,
      collectionName: v.name,
      value: v.value,
      weightOfPortfolio: weightOf(v.value, total),
      holdingCount: v.count,
    })),
  );
}

const PERFORMANCE_WINDOWS: readonly PerformanceWindow[] = ["1D", "7D", "30D", "SINCE_MINT"];

function computePortfolioPerformance(
  holdings: readonly PortfolioHolding[],
): readonly PortfolioPerformancePoint[] {
  const points: PortfolioPerformancePoint[] = [];
  for (const window of PERFORMANCE_WINDOWS) {
    let weightedSum = 0;
    let totalWeight = 0;
    let holdingsIncluded = 0;
    for (const holding of holdings) {
      const point = holding.market.performance.find((p) => p.window === window);
      if (!point) continue;
      const weight = point.to.value;
      if (weight <= 0) continue; // a zero/negative weight would distort, not inform, the average
      weightedSum += point.change * weight;
      totalWeight += weight;
      holdingsIncluded += 1;
    }
    if (holdingsIncluded === 0 || totalWeight === 0) continue;
    points.push({ window, change: weightedSum / totalWeight, holdingsIncluded });
  }
  return points;
}

/**
 * Aggregate one owner's holdings into the full portfolio view. `holdings`
 * must already be filtered to `ownerAddress` — this function only
 * aggregates, it doesn't filter (mirrors `queryListings`'s split between
 * "resolve the query" and "apply it", TASK-20).
 */
export function aggregatePortfolio(
  ownerAddress: string,
  holdings: readonly PortfolioHolding[],
  asOf: UnixSeconds,
): Portfolio {
  const totalReferenceValue = holdings.reduce((sum, h) => sum + holdingValue(h), 0);
  const degraded = holdings.some((h) => h.market.degraded);

  return {
    ownerAddress,
    holdings,
    totalReferenceValue,
    degraded,
    performance: computePortfolioPerformance(holdings),
    exposureByAsset: computeExposureByAsset(holdings, totalReferenceValue),
    exposureBySegment: computeExposureBySegment(holdings, totalReferenceValue),
    exposureByCollection: computeExposureByCollection(holdings, totalReferenceValue),
    asOf,
  };
}
