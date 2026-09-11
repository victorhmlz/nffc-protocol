/**
 * Generates the art (TASK-12) and the mint-condition trait (TASK-13) at the
 * correct point of the mint flow — **before** the mint transaction is
 * simulated or signed, since `MintParams.staticMetadataURI` is an input to
 * `NFFC.mint`, not something the contract produces (`NFFC_Development_Plan.md`
 * v3.2 TASK-18; `docs/mint-flow.md`).
 *
 * All I/O (oracle observations, the current block, pinning) is injected —
 * deterministic given its inputs otherwise. `useMintFlow` calls this as the
 * first step of `mint()`, before `simulateMint`; a failure here surfaces
 * exactly like a simulation failure — no wallet interaction has happened yet.
 */
import { deriveSegment } from "@domain/nffc/segment";
import { renderNffcArt } from "@domain/art/art";
import { staticRarityScore } from "@domain/rarity/rarity";
import {
  computeMintCondition,
  toMetadataTrait,
  type OracleObservationAtMint,
} from "@domain/mint-condition/mint-condition";
import {
  buildStaticNffcMetadata,
  serializeStaticMetadata,
  type StaticComponentFact,
  type StaticNffcFacts,
  type StaticNffcMetadata,
} from "@domain/metadata/metadata";
import type { RepresentationId } from "@domain/registry/types";
import type { Hex32 } from "@domain/shared/branded";
import { computeCompositionHash } from "@/lib/wizard/composition-hash";
import type { WizardComponentDraft } from "@/lib/wizard/wizard-state";

/** The token id is not known until the mint transaction is mined — the pinned
 *  document necessarily predates it. Recorded here rather than left implicit;
 *  see `docs/mint-flow.md` "The tokenId-before-mint gap". */
export const PENDING_TOKEN_ID = "pending";

export interface PrepareMintMetadataInput {
  readonly components: readonly WizardComponentDraft[];
  readonly collectionId: string;
  readonly collectionName: string;
  readonly externalBaseUrl: string;
  /** Best-effort "as of submission" snapshot — not the eventual mined block,
   *  which isn't known yet. */
  readonly currentBlock: () => Promise<number>;
  readonly fetchObservations: (
    components: readonly { representationId: RepresentationId }[],
  ) => Promise<readonly OracleObservationAtMint[]>;
  /** Uploads the canonical bytes to content-addressed storage; returns its URI. */
  readonly pin: (bytes: string) => Promise<string>;
}

export interface PreparedMint {
  readonly staticMetadataURI: string;
  readonly metadata: StaticNffcMetadata;
}

export async function prepareMintMetadata(input: PrepareMintMetadataInput): Promise<PreparedMint> {
  const { components } = input;

  const seed = computeCompositionHash(components);
  const artSvg = renderNffcArt({
    seed,
    components: components.map((c) => ({ assetId: c.assetId, weightBps: c.weightBps })),
  }).svg;
  const artURI = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(artSvg)}`;

  const mintedAtBlock = await input.currentBlock();
  const observations = await input.fetchObservations(
    components.map((c) => ({ representationId: c.representationId })),
  );
  const mintCondition = computeMintCondition({
    tokenId: PENDING_TOKEN_ID,
    mintedAtBlock,
    mintedAt: Math.floor(Date.now() / 1000),
    components: components.map((c) => ({ representationId: c.representationId, weightBps: c.weightBps })),
    observations,
  });

  const staticComponents: StaticComponentFact[] = components.map((c, position) => ({
    position,
    assetId: c.assetId,
    assetSymbol: c.assetSymbol,
    assetClass: c.assetClass,
    providerId: c.providerId,
    representationId: c.representationId,
    weightBps: c.weightBps,
  }));

  const facts: StaticNffcFacts = {
    tokenId: PENDING_TOKEN_ID,
    collectionId: input.collectionId,
    compositionHash: seed as Hex32,
    segment: deriveSegment(components.map((c) => c.assetClass === "CRYPTO")),
    componentCount: components.length,
    components: staticComponents,
    mintedAtBlock,
    staticRarity: staticRarityScore(components.map((c) => c.weightBps)),
    mintConditionTrait: toMetadataTrait(mintCondition),
  };

  const metadata = buildStaticNffcMetadata({
    facts,
    collectionName: input.collectionName,
    artURI,
    externalBaseUrl: input.externalBaseUrl,
  });

  const staticMetadataURI = await input.pin(serializeStaticMetadata(metadata));

  return { staticMetadataURI, metadata };
}
