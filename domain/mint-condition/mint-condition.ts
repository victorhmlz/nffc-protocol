/**
 * Mint-condition trait engine (TASK-13). An immutable record of the **weighted
 * market state at the instant of mint** — how far the weighted set was trading
 * from its all-time highs — sourced from the price oracle
 * (`NFFC_Development_Plan.md` v3.2 TASK-13; `NFFC_Whitepaper.md` §16;
 * `docs/spec/08-security-principles.md` A8; `docs/mint-condition-trait.md`).
 *
 * It is a **public market fact, not a promise**: frozen once at mint into the
 * static metadata (`docs/metadata-architecture.md`, `StaticNffcFacts`), and
 * reproducible by anyone — given the mint block, fetch each feed's round data
 * and historical max and re-run {computeMintCondition}.
 *
 * The oracle observations are produced by the Price Engine + indexer (TASK-22);
 * this module is the pure, deterministic computation over them.
 */
import { BPS_TOTAL } from "@domain/nffc/composition";

export const MINT_CONDITION_SCHEMA = "nffc.mintcond.v1";

/** A component is "at its high" when within this many bps of its ATH. */
export const AT_HIGH_BPS = 100;

export type MintConditionRegime =
  "at-highs" | "near-highs" | "mid" | "deep-drawdown";

/** Upper bound (inclusive) of `weightedDrawdownBps` for each regime. */
export const MINT_CONDITION_REGIME_BOUNDS: readonly {
  readonly regime: MintConditionRegime;
  readonly maxBps: number;
}[] = [
  { regime: "at-highs", maxBps: 149 },
  { regime: "near-highs", maxBps: 999 },
  { regime: "mid", maxBps: 2999 },
  { regime: "deep-drawdown", maxBps: 10_000 },
];

export class MintConditionInputError extends Error {
  override name = "MintConditionInputError";
}

/** What the oracle yields for one representation at the mint round. */
export interface OracleObservationAtMint {
  readonly representationId: string;
  readonly priceAtMint: number; // > 0, in the feed's normalized units
  readonly allTimeHigh: number; // > 0, max normalized price up to the mint round
  readonly source: string; // e.g. "chainlink:0xFEED…"
  readonly roundId: string; // the aggregator round used
  readonly observedAt: number; // that round's updatedAt, unix seconds
}

export interface MintConditionInput {
  readonly tokenId: string;
  readonly mintedAtBlock: number;
  readonly mintedAt: number; // unix seconds
  /** Composition components, in on-chain order. */
  readonly components: readonly {
    readonly representationId: string;
    readonly weightBps: number;
  }[];
  /** Exactly one observation per component (matched by `representationId`). */
  readonly observations: readonly OracleObservationAtMint[];
}

export interface MintConditionComponent {
  readonly representationId: string;
  readonly weightBps: number;
  /** `round((1 - price/ath) * 10000)`, clamped to `[0, 10000]`. */
  readonly drawdownBps: number;
  readonly atHigh: boolean;
}

export interface MintConditionTrait {
  readonly schema: typeof MINT_CONDITION_SCHEMA;
  readonly tokenId: string;
  readonly mintedAtBlock: number;
  readonly mintedAt: number;
  /** Weight-averaged component drawdown, in bps. 0 = whole set at its highs. */
  readonly weightedDrawdownBps: number;
  readonly regime: MintConditionRegime;
  readonly componentsAtHigh: number;
  readonly components: readonly MintConditionComponent[];
  /** The exact oracle rounds used — everything needed to reproduce the value. */
  readonly basis: readonly {
    readonly representationId: string;
    readonly source: string;
    readonly roundId: string;
    readonly observedAt: number;
  }[];
}

function clampBps(n: number): number {
  if (n < 0) return 0;
  if (n > BPS_TOTAL) return BPS_TOTAL;
  return n;
}

function regimeFor(weightedDrawdownBps: number): MintConditionRegime {
  for (const b of MINT_CONDITION_REGIME_BOUNDS) {
    if (weightedDrawdownBps <= b.maxBps) return b.regime;
  }
  return "deep-drawdown";
}

/**
 * Compute the frozen trait. Deterministic and total — throws
 * `MintConditionInputError` only on inputs the on-chain composition invariants
 * (I1–I4) plus "one oracle observation per component" already rule out.
 */
export function computeMintCondition(
  input: MintConditionInput,
): MintConditionTrait {
  const { components, observations } = input;

  if (components.length === 0) {
    throw new MintConditionInputError("composition has no components");
  }
  const weightSum = components.reduce((a, c) => a + c.weightBps, 0);
  if (weightSum !== BPS_TOTAL) {
    throw new MintConditionInputError(
      `weights sum to ${weightSum}, expected ${BPS_TOTAL}`,
    );
  }
  if (components.some((c) => c.weightBps <= 0)) {
    throw new MintConditionInputError("every weightBps must be > 0");
  }
  if (!Number.isInteger(input.mintedAtBlock) || input.mintedAtBlock < 0) {
    throw new MintConditionInputError(
      "mintedAtBlock must be a non-negative integer",
    );
  }
  if (!Number.isFinite(input.mintedAt) || input.mintedAt < 0) {
    throw new MintConditionInputError(
      "mintedAt must be a non-negative unix timestamp",
    );
  }

  const byRep = new Map<string, OracleObservationAtMint>();
  for (const o of observations) {
    if (byRep.has(o.representationId)) {
      throw new MintConditionInputError(
        `duplicate observation for ${o.representationId}`,
      );
    }
    byRep.set(o.representationId, o);
  }
  if (observations.length !== components.length) {
    throw new MintConditionInputError(
      `expected ${components.length} observations, got ${observations.length}`,
    );
  }

  let weightedNumerator = 0; // Σ weightBps · drawdownBps
  let componentsAtHigh = 0;

  const outComponents: MintConditionComponent[] = components.map((c) => {
    const o = byRep.get(c.representationId);
    if (!o)
      throw new MintConditionInputError(
        `no oracle observation for ${c.representationId}`,
      );
    if (!(o.priceAtMint > 0)) {
      throw new MintConditionInputError(
        `priceAtMint must be > 0 for ${c.representationId}`,
      );
    }
    if (!(o.allTimeHigh > 0)) {
      throw new MintConditionInputError(
        `allTimeHigh must be > 0 for ${c.representationId}`,
      );
    }

    const drawdownBps = clampBps(
      Math.round((1 - o.priceAtMint / o.allTimeHigh) * BPS_TOTAL),
    );
    const atHigh = drawdownBps <= AT_HIGH_BPS;
    if (atHigh) componentsAtHigh += 1;
    weightedNumerator += c.weightBps * drawdownBps;

    return {
      representationId: c.representationId,
      weightBps: c.weightBps,
      drawdownBps,
      atHigh,
    };
  });

  const weightedDrawdownBps = Math.round(weightedNumerator / BPS_TOTAL);

  return {
    schema: MINT_CONDITION_SCHEMA,
    tokenId: input.tokenId,
    mintedAtBlock: input.mintedAtBlock,
    mintedAt: input.mintedAt,
    weightedDrawdownBps,
    regime: regimeFor(weightedDrawdownBps),
    componentsAtHigh,
    components: outComponents,
    basis: components.map((c) => {
      const o = byRep.get(c.representationId)!;
      return {
        representationId: o.representationId,
        source: o.source,
        roundId: o.roundId,
        observedAt: o.observedAt,
      };
    }),
  };
}

export interface MintConditionVerification {
  readonly ok: boolean;
  readonly mismatches: readonly string[];
}

/**
 * Reproduce the trait from freshly-fetched historical oracle data and compare it
 * to what was frozen at mint (acceptance: "given the mint timestamp, anyone can
 * verify the original value"). `input` must be rebuilt from the mint block + the
 * feeds' round history — not from the stored trait.
 */
export function verifyMintCondition(
  stored: MintConditionTrait,
  input: MintConditionInput,
): MintConditionVerification {
  const m: string[] = [];
  let recomputed: MintConditionTrait;
  try {
    recomputed = computeMintCondition(input);
  } catch (e) {
    return {
      ok: false,
      mismatches: [`recompute failed: ${(e as Error).message}`],
    };
  }

  if (stored.schema !== recomputed.schema)
    m.push(`schema ${stored.schema} != ${recomputed.schema}`);
  if (stored.tokenId !== recomputed.tokenId)
    m.push(`tokenId ${stored.tokenId} != ${recomputed.tokenId}`);
  if (stored.mintedAtBlock !== recomputed.mintedAtBlock) {
    m.push(
      `mintedAtBlock ${stored.mintedAtBlock} != ${recomputed.mintedAtBlock}`,
    );
  }
  if (stored.weightedDrawdownBps !== recomputed.weightedDrawdownBps) {
    m.push(
      `weightedDrawdownBps ${stored.weightedDrawdownBps} != ${recomputed.weightedDrawdownBps}`,
    );
  }
  if (stored.regime !== recomputed.regime)
    m.push(`regime ${stored.regime} != ${recomputed.regime}`);
  if (stored.componentsAtHigh !== recomputed.componentsAtHigh) {
    m.push(
      `componentsAtHigh ${stored.componentsAtHigh} != ${recomputed.componentsAtHigh}`,
    );
  }
  if (stored.components.length !== recomputed.components.length) {
    m.push(
      `components length ${stored.components.length} != ${recomputed.components.length}`,
    );
  } else {
    recomputed.components.forEach((rc, i) => {
      const sc = stored.components[i]!;
      if (sc.representationId !== rc.representationId) {
        m.push(
          `components[${i}].representationId ${sc.representationId} != ${rc.representationId}`,
        );
      }
      if (sc.weightBps !== rc.weightBps)
        m.push(`components[${i}].weightBps ${sc.weightBps} != ${rc.weightBps}`);
      if (sc.drawdownBps !== rc.drawdownBps) {
        m.push(
          `components[${i}].drawdownBps ${sc.drawdownBps} != ${rc.drawdownBps}`,
        );
      }
      if (sc.atHigh !== rc.atHigh)
        m.push(`components[${i}].atHigh ${sc.atHigh} != ${rc.atHigh}`);
    });
  }

  return { ok: m.length === 0, mismatches: m };
}

/**
 * Flatten the trait for `StaticNffcFacts.mintConditionTrait`
 * (`docs/metadata-architecture.md`) — plain string/number pairs that
 * `buildStaticNffcMetadata` turns into `Mint · …` attributes.
 */
export function toMetadataTrait(
  trait: MintConditionTrait,
): Readonly<Record<string, string | number>> {
  return {
    "Weighted Drawdown (bps)": trait.weightedDrawdownBps,
    Regime: trait.regime,
    "Components At Highs": trait.componentsAtHigh,
    "Minted At Block": trait.mintedAtBlock,
  };
}
