/**
 * Chainlink-backed `PriceOracle` (TASK-22) — the primary oracle in V1
 * (`docs/spec/03-architecture.md` §6, `docs/price-engine.md`). Provider-agnostic
 * by construction: it reads each representation's own oracle metadata from
 * `RepresentationRegistry` — registered identically for Stock Tokens
 * (TASK-06) and native crypto (TASK-07) — and calls the standard Chainlink
 * `AggregatorV3Interface.latestRoundData()`. Nothing in this file branches on
 * asset class; the on-chain `Representation` struct it reads doesn't even
 * carry that field (it lives on `AssetIdentityRegistry`, a different
 * contract), so "no conditional logic by asset type" (TASK-22 acceptance) is
 * structural, not a convention this class has to uphold by discipline.
 *
 * A second oracle provider is a second class implementing `PriceOracle`, not
 * a change here or to `NormalizedPrice` (TASK-22 acceptance) — proven by
 * `tests/support/price-oracle-contract.ts`'s shared suite, run against this
 * class and against an independent in-memory implementation in
 * `chainlink-price-oracle.test.ts`.
 */
import type { PriceOracle } from "@domain/ports/price-oracle";
import type { ChainReader } from "@domain/ports/chain-reader";
import type { Clock } from "@domain/ports/clock";
import type { RepresentationId } from "@domain/registry/types";
import type { Address, UnixSeconds } from "@domain/shared/branded";
import type { NormalizedPrice, PriceSource } from "@domain/pricing/types";

const GET_REPRESENTATION_SIGNATURE =
  "function getRepresentation(bytes32) view returns (bytes32 representationId, bytes32 assetId, bytes32 providerId, uint256 chainId, address token, bytes32 tokenStandard, uint8 decimals, uint256 multiplier, (address feed, uint32 heartbeat, uint8 feedDecimals) oracle, uint8 status, uint64 createdAt, uint64 updatedAt)";

const LATEST_ROUND_DATA_SIGNATURE =
  "function latestRoundData() view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)";

/** `1e18` on-chain == a `1.0` ratio off-chain (`contracts/RepresentationRegistry.sol`). */
const MULTIPLIER_WAD = 1_000_000_000_000_000_000n;

const REP_STATUS_ACTIVE = 1; // IRepresentationRegistry.RepStatus.ACTIVE

const ZERO_ADDRESS: Address = "0x0000000000000000000000000000000000000000" as Address;

/** The exact tuple shape `getRepresentation` decodes into. */
interface OnChainRepresentation {
  readonly representationId: `0x${string}`;
  readonly assetId: `0x${string}`;
  readonly providerId: `0x${string}`;
  readonly chainId: bigint;
  readonly token: Address;
  readonly tokenStandard: `0x${string}`;
  readonly decimals: number;
  readonly multiplier: bigint;
  readonly oracle: { readonly feed: Address; readonly heartbeat: number; readonly feedDecimals: number };
  readonly status: number;
  readonly createdAt: bigint;
  readonly updatedAt: bigint;
}

interface OnChainRoundData {
  readonly roundId: bigint;
  readonly answer: bigint;
  readonly startedAt: bigint;
  readonly updatedAt: bigint;
  readonly answeredInRound: bigint;
}

export class RepresentationInactiveError extends Error {
  override name = "RepresentationInactiveError";
  constructor(representationId: string) {
    super(`Representation ${representationId} is not ACTIVE.`);
  }
}

export class NoOracleConfiguredError extends Error {
  override name = "NoOracleConfiguredError";
  constructor(representationId: string) {
    super(`Representation ${representationId} has no oracle feed configured.`);
  }
}

export interface ChainlinkPriceOracleOptions {
  readonly registryAddress: Address;
  readonly reader: ChainReader;
  readonly clock: Clock;
  /** Extra seconds of tolerance beyond the feed's own heartbeat before a price
   *  is marked stale (`docs/spec/09-data-model.md`'s "heartbeat + grace"). */
  readonly gracePeriodSeconds?: number;
}

const DEFAULT_GRACE_PERIOD_SECONDS = 300;

export class ChainlinkPriceOracle implements PriceOracle {
  private readonly registryAddress: Address;
  private readonly reader: ChainReader;
  private readonly clock: Clock;
  private readonly gracePeriodSeconds: number;

  constructor(opts: ChainlinkPriceOracleOptions) {
    this.registryAddress = opts.registryAddress;
    this.reader = opts.reader;
    this.clock = opts.clock;
    this.gracePeriodSeconds = opts.gracePeriodSeconds ?? DEFAULT_GRACE_PERIOD_SECONDS;
  }

  async getPrice(representationId: RepresentationId): Promise<NormalizedPrice> {
    const rep = await this.reader.readContract<OnChainRepresentation>({
      address: this.registryAddress,
      signature: GET_REPRESENTATION_SIGNATURE,
      args: [representationId],
    });

    if (rep.status !== REP_STATUS_ACTIVE) {
      throw new RepresentationInactiveError(representationId);
    }
    if (rep.oracle.feed === ZERO_ADDRESS) {
      throw new NoOracleConfiguredError(representationId);
    }

    const round = await this.reader.readContract<OnChainRoundData>({
      address: rep.oracle.feed,
      signature: LATEST_ROUND_DATA_SIGNATURE,
      args: [],
    });

    const feedDecimals = rep.oracle.feedDecimals;
    const multiplierRatio = Number(rep.multiplier) / Number(MULTIPLIER_WAD);
    const normalized = (Number(round.answer) / 10 ** feedDecimals) * multiplierRatio;

    const observedAt = Number(round.updatedAt) as UnixSeconds;
    const nowSeconds = Math.floor(this.clock.nowMillis() / 1000);
    const stale = nowSeconds - observedAt > rep.oracle.heartbeat + this.gracePeriodSeconds;

    return {
      representationId,
      raw: round.answer,
      normalized,
      priceDecimals: feedDecimals,
      observedAt,
      source: `chainlink:${rep.oracle.feed}` as PriceSource,
      multiplier: multiplierRatio,
      stale,
    };
  }

  async getPrices(
    representationIds: readonly RepresentationId[],
  ): Promise<ReadonlyMap<RepresentationId, NormalizedPrice>> {
    const prices = await Promise.all(representationIds.map((id) => this.getPrice(id)));
    return new Map(representationIds.map((id, i) => [id, prices[i]!]));
  }
}
