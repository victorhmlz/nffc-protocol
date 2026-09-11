import { describe, expect, it, vi } from "vitest";
import { keccak256, stringToHex } from "viem";
import type { AssetId, ProviderId, RepresentationId } from "@domain/registry/types";
import type { WizardComponentDraft } from "@/lib/wizard/wizard-state";
import { PENDING_TOKEN_ID, prepareMintMetadata, type PrepareMintMetadataInput } from "@/lib/wizard/prepare-mint-metadata";
import { computeCompositionHash } from "@/lib/wizard/composition-hash";

function id<T>(s: string): T {
  return keccak256(stringToHex(s)) as T;
}

const NVDA: WizardComponentDraft = {
  assetId: id<AssetId>("NVDA"),
  representationId: id<RepresentationId>("NVDArep"),
  assetSymbol: "NVDA",
  assetClass: "EQUITY",
  providerId: "ROBINHOOD" as ProviderId,
  weightBps: 6000,
};
const BTC: WizardComponentDraft = {
  assetId: id<AssetId>("BTC"),
  representationId: id<RepresentationId>("BTCrep"),
  assetSymbol: "BTC",
  assetClass: "CRYPTO",
  providerId: "CRYPTO_NATIVE" as ProviderId,
  weightBps: 4000,
};

function input(overrides: Partial<PrepareMintMetadataInput> = {}): PrepareMintMetadataInput {
  return {
    components: [NVDA, BTC],
    collectionId: "0",
    collectionName: "Demo",
    externalBaseUrl: "https://nffc.example",
    currentBlock: vi.fn().mockResolvedValue(12345),
    fetchObservations: vi.fn().mockImplementation(async (comps: readonly { representationId: RepresentationId }[]) =>
      comps.map((c) => ({
        representationId: c.representationId,
        priceAtMint: 100,
        allTimeHigh: 100,
        source: "fixture",
        roundId: "1",
        observedAt: 1_700_000_000,
      })),
    ),
    pin: vi.fn().mockImplementation(async (bytes: string) => `data:application/json,${encodeURIComponent(bytes)}`),
    ...overrides,
  };
}

describe("prepareMintMetadata", () => {
  it("computes the metadata from the composition and pins it, in order", async () => {
    const i = input();
    const result = await prepareMintMetadata(i);

    expect(i.currentBlock).toHaveBeenCalled();
    expect(i.fetchObservations).toHaveBeenCalled();
    expect(i.pin).toHaveBeenCalled();
    expect(result.staticMetadataURI).toContain("data:application/json,");
  });

  it("the compositionHash matches computeCompositionHash over the same components", async () => {
    const { metadata } = await prepareMintMetadata(input());
    expect(metadata.nffc.compositionHash).toBe(computeCompositionHash([NVDA, BTC]));
  });

  it("derives the segment (mixed) and includes a mint-condition trait", async () => {
    const { metadata } = await prepareMintMetadata(input());
    expect(metadata.nffc.segment).toBe("MIXED");
    expect(metadata.nffc.mintConditionTrait).not.toBeNull();
    expect(metadata.nffc.mintConditionTrait).toHaveProperty("Regime");
  });

  it("uses the placeholder token id — not known until the mint is mined", async () => {
    const { metadata } = await prepareMintMetadata(input());
    expect(metadata.nffc.tokenId).toBe(PENDING_TOKEN_ID);
  });

  it("records mintedAtBlock from the injected currentBlock", async () => {
    const { metadata } = await prepareMintMetadata(input({ currentBlock: vi.fn().mockResolvedValue(999) }));
    expect(metadata.nffc.mintedAtBlock).toBe(999);
  });

  it("propagates a failure from any injected step without swallowing it", async () => {
    await expect(
      prepareMintMetadata(input({ currentBlock: vi.fn().mockRejectedValue(new Error("rpc down")) })),
    ).rejects.toThrow("rpc down");
    await expect(
      prepareMintMetadata(input({ pin: vi.fn().mockRejectedValue(new Error("pin service down")) })),
    ).rejects.toThrow("pin service down");
  });
});
