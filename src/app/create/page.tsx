"use client";

import { useState } from "react";
import { keccak256, stringToHex } from "viem";
import type {
  AssetClass,
  AssetId,
  ProviderId,
  RepresentationId,
} from "@domain/registry/types";
import type { RepresentationLookup } from "@domain/nffc/validate-composition";
import { CreateWizard } from "@/components/wizard/create-wizard";
import { Container } from "@/components/ui/container";
import type { AvailableAsset, FeeQuote } from "@/lib/wizard/types";
import type { TransactionState } from "@/lib/wallet/transaction-state";

// A fixture asset universe — both providers, one list, mirroring
// config/robinhood/stock-tokens.example.json + config/crypto/native-tokens.example.json.
// A real page reads this from the indexer (TASK-20/24); the shape is final,
// only the source is a placeholder until then. Ids are real bytes32 values
// (like AssetIdentityRegistry.computeAssetId) — computeCompositionHash needs
// exactly that shape, the same as the deployed registries produce.
function asset(
  symbol: string,
  name: string,
  assetClass: AssetClass,
  providerId: string,
): AvailableAsset {
  return {
    assetId: keccak256(stringToHex(`asset:${symbol}`)) as AssetId,
    assetSymbol: symbol,
    assetName: name,
    assetClass,
    providerId: providerId as ProviderId,
    representationId: keccak256(
      stringToHex(`rep:${providerId}:${symbol}`),
    ) as RepresentationId,
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
    AVAILABLE_ASSETS.some(
      (a) => a.representationId === representationId && a.assetId === assetId,
    ),
};

// A placeholder affine curve — the real fee comes from Collection.sol
// (TASK-10) + IFeeConfig (TASK-30) once deployed (TASK-31).
function quoteFees(componentCount: number): FeeQuote {
  const base = 5_000_000_000_000_000n; // 0.005 ETH
  const perComponent = 500_000_000_000_000n; // 0.0005 ETH
  const mintFeeWei =
    base + perComponent * BigInt(Math.max(0, componentCount - 1));
  return {
    collectionCreationFeeWei: 10_000_000_000_000_000n, // 0.01 ETH — "new collection"
    mintFeeWei,
    gasEstimateWei: null, // not yet simulated — no deployed contract to simulate against
    totalWei: 10_000_000_000_000_000n + mintFeeWei,
  };
}

export default function CreatePage() {
  // No deployed NFFC address yet (TASK-31) — the Mint step renders TASK-16's
  // state machine, but nothing calls a real contract until then.
  const [mintState] = useState<TransactionState>("idle");

  return (
    <Container className="py-10">
      <header className="mb-8 flex flex-col gap-1">
        <h1 className="text-lg font-semibold tracking-tight">Create an NFFC</h1>
        <p className="text-sm text-muted-foreground">
          Compose a weighted, immutable set of verified on-chain assets. Fees
          are shown in full before you sign.
        </p>
      </header>
      <CreateWizard
        availableAssets={AVAILABLE_ASSETS}
        lookup={FIXTURE_LOOKUP}
        quoteFees={quoteFees}
        mint={{
          state: mintState,
          error: null,
          onMint: () => {
            // TODO(TASK-18/31): call NFFC.mint via useTransactionFlow() once a
            // deployed contract address + composed MintParams are available.
          },
        }}
      />
    </Container>
  );
}
