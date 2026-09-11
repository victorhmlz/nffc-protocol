/**
 * The exact `compositionHash` `NFFC.mint` will store —
 * `keccak256(abi.encode(comps))` over `Component[] { bytes32 assetId, bytes32
 * representationId, uint16 weightBps }`, in submission order (`contracts/NFFC.sol`).
 *
 * Computed client-side with viem's ABI encoder (the same encoder every wallet
 * and indexer in the ecosystem uses to talk to this exact contract shape), so
 * the wizard's Step 5 art preview seeds `renderNffcArt` with the identical
 * value the deployed contract will return from `getCompositionHash` — the
 * TASK-17 acceptance: "the art preview matches exactly the post-mint result."
 */
import { encodeAbiParameters, keccak256, type Hex } from "viem";
import type { AssetId, RepresentationId } from "@domain/registry/types";

const COMPONENT_TUPLE = {
  type: "tuple[]",
  components: [
    { name: "assetId", type: "bytes32" },
    { name: "representationId", type: "bytes32" },
    { name: "weightBps", type: "uint16" },
  ],
} as const;

export interface HashableComponent {
  readonly assetId: AssetId;
  readonly representationId: RepresentationId;
  readonly weightBps: number;
}

export function computeCompositionHash(
  components: readonly HashableComponent[],
): Hex {
  const encoded = encodeAbiParameters(
    [COMPONENT_TUPLE],
    [
      components.map((c) => ({
        assetId: c.assetId as unknown as Hex,
        representationId: c.representationId as unknown as Hex,
        weightBps: c.weightBps,
      })),
    ],
  );
  return keccak256(encoded);
}
