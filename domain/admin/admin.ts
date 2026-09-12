/**
 * Admin panel domain layer (TASK-31) — "activos, representaciones, fees,
 * colecciones, reportes, salud del sistema"
 * (`NFFC_Development_Plan.md` v3.4 TASK-31). Two pure, testable pieces live
 * here; everything else the panel shows is either a direct read of an
 * existing type (`AssetIdentity`/`Representation`, `@domain/registry/types`,
 * TASK-02/05) or a direct pass-through of `infra/health.ts`'s `HealthReport`
 * (TASK-04) — no reason to wrap either in a new domain shape.
 *
 * **Roles.** `ADMIN_ROLE_META` names the four `AccessControl` roles this
 * protocol's contracts actually declare (`REGISTRY_ADMIN_ROLE`,
 * `AssetIdentityRegistry.sol`/`RepresentationRegistry.sol`, TASK-05;
 * `FEE_ADMIN_ROLE`, `FeeConfig.sol`, TASK-30; `PAUSER_ROLE`, every pausable
 * contract; `DEFAULT_ADMIN_ROLE`, all of them) — purely descriptive metadata
 * for the UI to label things with. The acceptance criterion itself —
 * "Toda acción administrativa sensible pasa por multisig, nunca por una sola
 * clave" (`docs/spec/08-security-principles.md` S8) — is an *operational*
 * fact about which address a role is granted to at deploy time, not
 * something any TypeScript here can enforce; see `docs/admin.md` for why the
 * panel's own answer is to make that requirement visible everywhere, not to
 * fabricate an on-chain-role check with no contract yet to check it against.
 */
import type { IndexedNffcSummary } from "@domain/marketplace/listings";
import type { ActivityEntry } from "@domain/nffc-detail/detail";
import type { CompositionSegment } from "@domain/nffc/composition";

export type AdminRole = "DEFAULT_ADMIN" | "REGISTRY_ADMIN" | "FEE_ADMIN" | "PAUSER";

export interface AdminRoleMeta {
  readonly label: string;
  /** The exact `bytes32` role constant's Solidity name. */
  readonly contractRoleName: string;
  readonly description: string;
}

export const ADMIN_ROLE_META: Record<AdminRole, AdminRoleMeta> = {
  DEFAULT_ADMIN: {
    label: "Default Admin",
    contractRoleName: "DEFAULT_ADMIN_ROLE",
    description: "Grants and revokes every other role, on every contract. Held by the protocol multisig only.",
  },
  REGISTRY_ADMIN: {
    label: "Registry Admin",
    contractRoleName: "REGISTRY_ADMIN_ROLE",
    description: "Registers and (de)activates assets and representations (AssetIdentityRegistry, RepresentationRegistry).",
  },
  FEE_ADMIN: {
    label: "Fee Admin",
    contractRoleName: "FEE_ADMIN_ROLE",
    description: "Sets every protocol fee curve, the marketplace fee, royalties, and the fee recipient (FeeConfig).",
  },
  PAUSER: {
    label: "Pauser",
    contractRoleName: "PAUSER_ROLE",
    description: "Pauses/unpauses NFFC, Collection, and Marketplace in an emergency.",
  },
};

export interface CollectionOverview {
  readonly collectionId: string;
  readonly collectionName: string;
  /** The creator of the *first* indexed NFFC seen for this collection — a
   *  proxy, not a read of `Collection.ownerOfCollection`, for the same
   *  reason `domain/profile/profile.ts`'s `collections` facet is a proxy
   *  (`docs/OPEN_ISSUES.md` Issue #9: the indexer doesn't mirror a real
   *  `collection` table yet). In practice every NFFC minted into one
   *  collection shares its creator (`Collection.sol` fixes the creator once,
   *  at creation), so this is accurate today, not just approximate. */
  readonly creatorAddress: string;
  readonly nffcCount: number;
}

/** Every collection with at least one indexed NFFC — unlike
 *  `domain/profile/profile.ts`'s `buildProfile`, not filtered to one
 *  wallet's own creations; this is the admin's protocol-wide view. Sorted by
 *  `nffcCount` descending. */
export function listAllCollections(nffcs: readonly IndexedNffcSummary[]): readonly CollectionOverview[] {
  const byCollection = new Map<string, { name: string; creator: string; count: number }>();
  for (const n of nffcs) {
    const existing = byCollection.get(n.collectionId);
    if (existing) existing.count += 1;
    else byCollection.set(n.collectionId, { name: n.collectionName, creator: n.creatorAddress, count: 1 });
  }
  return Array.from(byCollection.entries(), ([collectionId, v]) => ({
    collectionId,
    collectionName: v.name,
    creatorAddress: v.creator,
    nffcCount: v.count,
  })).sort((a, b) => b.nffcCount - a.nffcCount);
}

export interface ProtocolReport {
  readonly totalNffcs: number;
  readonly totalCollections: number;
  /** Every segment present in the indexed set — a segment with zero NFFCs
   *  simply doesn't appear, rather than showing a fabricated `0` row. */
  readonly segmentCounts: Partial<Record<CompositionSegment, number>>;
  readonly activeListingCount: number;
  /** Σ of every `SALE` activity entry's `amountWei`, as a decimal string
   *  (never a `number` — precision; never a `bigint` — not RSC-serializable
   *  across the server/client boundary, matching `IndexedListing.priceWei`'s
   *  own documented reasoning, TASK-20). */
  readonly totalSaleVolumeWei: string;
  readonly saleCount: number;
}

/** Pure aggregation over the exact same indexed shapes every other read
 *  surface in this codebase already composes (`IndexedNffcSummary`,
 *  TASK-20; `ActivityEntry`, TASK-21/24/26) — the admin "reportes" facet is
 *  a third query over data other TASKs already query, not a new source. */
export function buildProtocolReport(
  nffcs: readonly IndexedNffcSummary[],
  activity: readonly ActivityEntry[],
): ProtocolReport {
  const segmentCounts: Partial<Record<CompositionSegment, number>> = {};
  for (const n of nffcs) {
    segmentCounts[n.segment] = (segmentCounts[n.segment] ?? 0) + 1;
  }

  const activeListingCount = nffcs.filter((n) => n.listing?.active).length;

  let totalSaleVolume = 0n;
  let saleCount = 0;
  for (const entry of activity) {
    if (entry.kind !== "SALE" || entry.amountWei === null) continue;
    totalSaleVolume += BigInt(entry.amountWei);
    saleCount += 1;
  }

  return {
    totalNffcs: nffcs.length,
    totalCollections: listAllCollections(nffcs).length,
    segmentCounts,
    activeListingCount,
    totalSaleVolumeWei: totalSaleVolume.toString(),
    saleCount,
  };
}
