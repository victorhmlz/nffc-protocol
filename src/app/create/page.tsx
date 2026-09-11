"use client";

import type { useWriteContract } from "wagmi";
import { keccak256, stringToHex } from "viem";
import type { AssetClass, AssetId, ProviderId, RepresentationId } from "@domain/registry/types";
import type { RepresentationLookup } from "@domain/nffc/validate-composition";
import { CreateWizard } from "@/components/wizard/create-wizard";
import { Container } from "@/components/ui/container";
import { prepareMintMetadata } from "@/lib/wizard/prepare-mint-metadata";
import type { AvailableAsset, FeeQuote } from "@/lib/wizard/types";
import type { WizardComponentDraft } from "@/lib/wizard/wizard-state";

type WriteContractParams = Parameters<ReturnType<typeof useWriteContract>["writeContract"]>[0];

// A fixture asset universe — both providers, one list, mirroring
// config/robinhood/stock-tokens.example.json + config/crypto/native-tokens.example.json.
// A real page reads this from the indexer (TASK-20/24); the shape is final,
// only the source is a placeholder until then. Ids are real bytes32 values
// (like AssetIdentityRegistry.computeAssetId) — computeCompositionHash needs
// exactly that shape, the same as the deployed registries produce.
function asset(symbol: string, name: string, assetClass: AssetClass, providerId: string): AvailableAsset {
  return {
    assetId: keccak256(stringToHex(`asset:${symbol}`)) as AssetId,
    assetSymbol: symbol,
    assetName: name,
    assetClass,
    providerId: providerId as ProviderId,
    representationId: keccak256(stringToHex(`rep:${providerId}:${symbol}`)) as RepresentationId,
  };
}

const AVAILABLE_ASSETS: AvailableAsset[] = [
  asset("NVDA", "NVIDIA Corporation", "EQUITY", "ROBINHOOD"),
  asset("MSFT", "Microsoft Corporation", "EQUITY", "ROBINHOOD"),
  asset("BTC", "Bitcoin", "CRYPTO", "CRYPTO_NATIVE"),
  asset("ETH", "Ether", "CRYPTO", "CRYPTO_NATIVE"),
];

// Every fixture asset is registered + active and resolves to itself — a real
// lookup reads NFFC.sol's registries (TASK-05) once deployed (TASK-31).
const FIXTURE_LOOKUP: RepresentationLookup = {
  isActiveRepresentation: (representationId) =>
    AVAILABLE_ASSETS.some((a) => a.representationId === representationId),
  resolvesTo: (representationId, assetId) =>
    AVAILABLE_ASSETS.some((a) => a.representationId === representationId && a.assetId === assetId),
};

// A placeholder affine curve — the real fee comes from Collection.sol
// (TASK-10) + IFeeConfig (TASK-30) once deployed (TASK-31).
function quoteFees(componentCount: number): FeeQuote {
  const base = 5_000_000_000_000_000n; // 0.005 ETH
  const perComponent = 500_000_000_000_000n; // 0.0005 ETH
  const mintFeeWei = base + perComponent * BigInt(Math.max(0, componentCount - 1));
  return {
    collectionCreationFeeWei: 10_000_000_000_000_000n, // 0.01 ETH — "new collection"
    mintFeeWei,
    gasEstimateWei: null, // not yet simulated — no deployed contract to simulate against
    totalWei: 10_000_000_000_000_000n + mintFeeWei,
  };
}

// TASK-18: generate the art (TASK-12) + mint-condition trait (TASK-13) and pin
// them — the correct point in the flow, before simulation. The price engine
// (TASK-22) doesn't exist yet, so observations are an honest "no oracle yet"
// fixture rather than a fabricated price; pinning is a self-contained data URI
// until real IPFS/Arweave infra exists.
async function prepareMintMetadataFixture(components: readonly WizardComponentDraft[]): Promise<string> {
  const { staticMetadataURI } = await prepareMintMetadata({
    components,
    collectionId: "0",
    collectionName: "Demo Collection",
    externalBaseUrl: "https://nffc.example",
    currentBlock: () => Promise.resolve(0), // no chain connected — no deployed NFFC yet (TASK-31)
    fetchObservations: (comps) =>
      Promise.resolve(
        comps.map((c) => ({
          representationId: c.representationId,
          priceAtMint: 1,
          allTimeHigh: 1,
          source: "fixture:no-price-engine-yet",
          roundId: "0",
          observedAt: Math.floor(Date.now() / 1000),
        })),
      ),
    pin: (bytes) => Promise.resolve(`data:application/json,${encodeURIComponent(bytes)}`),
  });
  return staticMetadataURI;
}

// NFFC has no deployed address yet (TASK-31) — every simulation fails, which
// is the honest, live demonstration of the TASK-18 acceptance criterion: the
// wallet is never engaged (buildMintCall below is provably unreachable here).
function simulateMintFixture(): Promise<void> {
  return Promise.reject(new Error("NFFC is not deployed yet (TASK-31) — minting is unavailable."));
}

function buildMintCallFixture(): WriteContractParams {
  throw new Error("unreachable — simulateMintFixture always rejects until NFFC is deployed (TASK-31)");
}

export default function CreatePage() {
  return (
    <Container className="py-10">
      <header className="mb-8 flex flex-col gap-1">
        <h1 className="text-lg font-semibold tracking-tight">Create an NFFC</h1>
        <p className="text-sm text-muted-foreground">
          Compose a weighted, immutable set of verified on-chain assets. Fees are shown in full
          before you sign.
        </p>
      </header>
      <CreateWizard
        availableAssets={AVAILABLE_ASSETS}
        lookup={FIXTURE_LOOKUP}
        quoteFees={quoteFees}
        prepareMintMetadata={prepareMintMetadataFixture}
        simulateMint={simulateMintFixture}
        buildMintCall={buildMintCallFixture}
      />
    </Container>
  );
}
