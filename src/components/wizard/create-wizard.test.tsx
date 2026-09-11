import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { keccak256, stringToHex } from "viem";
import type {
  AssetClass,
  AssetId,
  ProviderId,
  RepresentationId,
} from "@domain/registry/types";
import type { RepresentationLookup } from "@domain/nffc/validate-composition";
import { CreateWizard } from "@/components/wizard/create-wizard";
import { computeCompositionHash } from "@/lib/wizard/composition-hash";
import type { AvailableAsset, FeeQuote } from "@/lib/wizard/types";
import { createTestWagmiConfig, WagmiTestProviders } from "../../../tests/support/wagmi-test-config";

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

const NVDA = asset("NVDA", "NVIDIA Corporation", "EQUITY", "ROBINHOOD");
const BTC = asset("BTC", "Bitcoin", "CRYPTO", "CRYPTO_NATIVE");
const ASSETS = [NVDA, BTC];

const LOOKUP: RepresentationLookup = {
  isActiveRepresentation: (id) => ASSETS.some((a) => a.representationId === id),
  resolvesTo: (id, assetId) =>
    ASSETS.some((a) => a.representationId === id && a.assetId === assetId),
};

const QUOTE: FeeQuote = {
  collectionCreationFeeWei: 1n,
  mintFeeWei: 2n,
  gasEstimateWei: null,
  totalWei: 3n,
};

function renderWizard() {
  return render(
    <WagmiTestProviders config={createTestWagmiConfig()}>
      <CreateWizard
        availableAssets={ASSETS}
        lookup={LOOKUP}
        quoteFees={() => QUOTE}
        prepareMintMetadata={() => Promise.resolve("ipfs://meta")}
        simulateMint={() => Promise.resolve()}
        buildMintCall={() => ({
          address: "0x0000000000000000000000000000000000000001",
          abi: [],
          functionName: "mint",
        })}
      />
    </WagmiTestProviders>,
  );
}

/** Drives the wizard from basic-info through Preview with a valid 60/40 split. */
async function reachPreview() {
  const utils = renderWizard();

  fireEvent.change(screen.getByPlaceholderText("e.g. Blue Chips"), {
    target: { value: "Blue Chips" },
  });
  fireEvent.click(screen.getByRole("button", { name: /continue$/i }));

  const nvdaRow = screen.getByText("NVDA").closest("tr")!;
  fireEvent.click(within(nvdaRow).getByRole("button", { name: /add/i }));
  const btcRow = screen.getByText("BTC").closest("tr")!;
  fireEvent.click(within(btcRow).getByRole("button", { name: /add/i }));
  fireEvent.click(screen.getByRole("button", { name: /^continue$/i }));

  fireEvent.change(screen.getByLabelText(/weight for nvda/i), {
    target: { value: "6000" },
  });
  fireEvent.change(screen.getByLabelText(/weight for btc/i), {
    target: { value: "4000" },
  });
  fireEvent.click(
    screen.getByRole("button", { name: /continue to validation/i }),
  );

  await screen.findByRole("status", {}, { timeout: 2000 }); // validation result
  fireEvent.click(screen.getByRole("button", { name: /continue to preview/i }));

  return utils;
}

describe("CreateWizard — asset selection is one surface for both providers (acceptance)", () => {
  it("lists Stock Tokens and native crypto together, no separate tabs/flows", () => {
    renderWizard();
    fireEvent.change(screen.getByPlaceholderText("e.g. Blue Chips"), {
      target: { value: "x" },
    });
    fireEvent.click(screen.getByRole("button", { name: /continue$/i }));

    // Both assets render inside the same single table.
    const table = screen.getByRole("table");
    expect(within(table).getByText("NVDA")).toBeInTheDocument();
    expect(within(table).getByText("ROBINHOOD")).toBeInTheDocument();
    expect(within(table).getByText("BTC")).toBeInTheDocument();
    expect(within(table).getByText("CRYPTO_NATIVE")).toBeInTheDocument();
  });
});

describe("CreateWizard — validation blocks preview until the composition is valid (acceptance)", () => {
  it("shows plain-language issues and does not advance past a failing check", async () => {
    renderWizard();
    fireEvent.change(screen.getByPlaceholderText("e.g. Blue Chips"), {
      target: { value: "x" },
    });
    fireEvent.click(screen.getByRole("button", { name: /continue$/i }));
    fireEvent.click(
      within(screen.getByText("NVDA").closest("tr")!).getByRole("button", {
        name: /add/i,
      }),
    );
    fireEvent.click(screen.getByRole("button", { name: /^continue$/i }));
    // leave the weight at 0 — an incomplete composition
    fireEvent.click(
      screen.getByRole("button", { name: /continue to validation/i }),
    );

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(/issue/i);
    expect(
      screen.queryByRole("button", { name: /continue to preview/i }),
    ).not.toBeInTheDocument();
  });
});

describe("CreateWizard — the art preview matches the exact post-mint composition hash (acceptance)", () => {
  it("seeds the preview art with computeCompositionHash over the selected components", async () => {
    await reachPreview();

    const expectedSeed = computeCompositionHash([
      {
        assetId: NVDA.assetId,
        representationId: NVDA.representationId,
        weightBps: 6000,
      },
      {
        assetId: BTC.assetId,
        representationId: BTC.representationId,
        weightBps: 4000,
      },
    ]);

    const art = screen.getByRole("img", { name: /generative art preview/i });
    expect(art.innerHTML.length).toBeGreaterThan(0);
    // renderNffcArt is deterministic — re-deriving with the same seed must
    // reproduce byte-identical markup, proving the preview used this exact seed.
    // (Compared via the same innerHTML round-trip jsdom applies to `art`, since
    // jsdom re-serializes self-closing tags like `<rect/>` as `<rect></rect>`.)
    const { renderNffcArt } = await import("@domain/art/art");
    const expectedSvg = renderNffcArt({
      seed: expectedSeed,
      components: [
        { assetId: NVDA.assetId, weightBps: 6000 },
        { assetId: BTC.assetId, weightBps: 4000 },
      ],
    }).svg;
    const probe = document.createElement("div");
    probe.innerHTML = expectedSvg;
    expect(art.innerHTML).toBe(probe.innerHTML);
  });

  it("shows the derived segment (mixed) and the composition table", async () => {
    await reachPreview();
    expect(screen.getByText("Mixed")).toBeInTheDocument();
    expect(screen.getByRole("table")).toHaveTextContent("NVDA");
    expect(screen.getByRole("table")).toHaveTextContent("BTC");
  });
});

describe("CreateWizard — the fee total is shown before Mint is reachable (acceptance)", () => {
  it("cannot reach the Mint step without visiting Fees", async () => {
    await reachPreview();
    fireEvent.click(screen.getByRole("button", { name: /continue to fees/i }));

    expect(screen.getByText(/total/i)).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /^mint$/i }),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /continue to mint/i }));
    expect(screen.getByRole("button", { name: /^mint$/i })).toBeInTheDocument();
  });

  it("cannot jump straight to Mint via the step indicator", async () => {
    await reachPreview();
    // "Mint" is step 7, still ahead of "preview" (step 5) — GOTO must reject it.
    const mintTab = screen.getByRole("button", { name: /7\. mint/i });
    expect(mintTab).toBeDisabled();
  });
});
