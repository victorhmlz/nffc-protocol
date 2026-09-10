import { type Hex, encodeAbiParameters, keccak256, stringToHex } from "viem";
import type {
  OnChainRepresentation,
  OracleMeta,
  ReconcilePlan,
  RobinhoodToken,
} from "./types";

/** `bytes32("ROBINHOOD")` — right-padded ASCII, matching the on-chain constant. */
export const ROBINHOOD_PROVIDER_ID: Hex = stringToHex("ROBINHOOD", {
  size: 32,
});

/**
 * `keccak256(abi.encode(providerId, chainId, token))` — the same id the
 * `RepresentationRegistry` computes. Deterministic, so the worker never needs an
 * on-chain call to know a token's representation id.
 */
export function computeRobinhoodRepresentationId(
  chainId: bigint,
  token: `0x${string}`,
): Hex {
  return keccak256(
    encodeAbiParameters(
      [{ type: "bytes32" }, { type: "uint256" }, { type: "address" }],
      [ROBINHOOD_PROVIDER_ID, chainId, token],
    ),
  );
}

function oracleEqual(a: OracleMeta, b: OracleMeta): boolean {
  return (
    a.feed.toLowerCase() === b.feed.toLowerCase() &&
    a.heartbeat === b.heartbeat &&
    a.feedDecimals === b.feedDecimals
  );
}

/**
 * Diff the provider's current list against on-chain state.
 *
 * - a provider token with no on-chain representation → **upsert** (register)
 * - a provider token whose representation is inactive → **upsert** (re-activate)
 * - a provider token whose on-chain oracle metadata differs → **upsert** (refresh)
 * - an **active** on-chain representation whose token left the provider list →
 *   **deactivate** (Robinhood delisted it)
 * - everything else → unchanged
 */
export function reconcile(
  onChain: readonly OnChainRepresentation[],
  providerTokens: readonly RobinhoodToken[],
  chainId: bigint,
): ReconcilePlan {
  const onChainById = new Map<Hex, OnChainRepresentation>();
  for (const rep of onChain) onChainById.set(rep.representationId, rep);

  const providerIds = new Set<Hex>();
  const toUpsert: RobinhoodToken[] = [];
  let unchanged = 0;

  for (const pt of providerTokens) {
    const id = computeRobinhoodRepresentationId(chainId, pt.token);
    providerIds.add(id);
    const existing = onChainById.get(id);
    if (
      !existing ||
      !existing.active ||
      !oracleEqual(existing.oracle, pt.oracle)
    ) {
      toUpsert.push(pt);
    } else {
      unchanged += 1;
    }
  }

  const toDeactivate = onChain
    .filter((rep) => rep.active && !providerIds.has(rep.representationId))
    .map((rep) => ({
      representationId: rep.representationId,
      token: rep.token,
    }));

  return { toUpsert, toDeactivate, unchanged };
}
