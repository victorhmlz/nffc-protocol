import { type Hex, encodeAbiParameters, keccak256 } from "viem";
import type {
  OnChainRepresentation,
  OracleMeta,
  ReconcilePlan,
  ProviderToken,
} from "./types";

/**
 * `keccak256(abi.encode(providerId, chainId, token))` — the same id
 * `RepresentationRegistry.computeRepresentationId` produces. Deterministic, so a
 * sync worker never needs an on-chain call to know a token's representation id.
 */
export function computeRepresentationId(
  providerId: Hex,
  chainId: bigint,
  token: `0x${string}`,
): Hex {
  return keccak256(
    encodeAbiParameters(
      [{ type: "bytes32" }, { type: "uint256" }, { type: "address" }],
      [providerId, chainId, token],
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
 * Diff a provider's current list against on-chain state.
 *
 * - provider token with no on-chain representation → **upsert** (register)
 * - provider token whose representation is inactive → **upsert** (re-activate)
 * - provider token whose on-chain oracle metadata differs → **upsert** (refresh)
 * - an **active** on-chain representation whose token left the provider list →
 *   **deactivate** (the provider delisted it)
 * - everything else → unchanged
 */
export function reconcile(
  onChain: readonly OnChainRepresentation[],
  providerTokens: readonly ProviderToken[],
  providerId: Hex,
  chainId: bigint,
): ReconcilePlan {
  const onChainById = new Map<Hex, OnChainRepresentation>();
  for (const rep of onChain) onChainById.set(rep.representationId, rep);

  const providerIds = new Set<Hex>();
  const toUpsert: ProviderToken[] = [];
  let unchanged = 0;

  for (const pt of providerTokens) {
    const id = computeRepresentationId(providerId, chainId, pt.token);
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
