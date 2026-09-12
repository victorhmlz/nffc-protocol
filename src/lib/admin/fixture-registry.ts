/**
 * Stand-in for `AssetIdentityRegistry.sol` / `RepresentationRegistry.sol`
 * (TASK-05) — a static, representative dataset in the exact shape
 * `AssetIdentity` / `Representation` fix (`domain/registry/types.ts`,
 * TASK-02). Ids are computed the same way `/create`'s own fixture does
 * (`src/app/create/page.tsx`'s `asset()` helper) so both surfaces agree on
 * the same assets. `src/lib/admin/get-assets.ts` / `get-representations.ts`
 * are the only importers — replacing this with a real registry read
 * (TASK-36 deploy) needs no change anywhere else.
 */
import { keccak256, stringToHex } from "viem";
import type { Address, UnixSeconds } from "@domain/shared/branded";
import type {
  AssetClass,
  AssetId,
  AssetIdentity,
  ProviderId,
  Representation,
  RepresentationId,
} from "@domain/registry/types";
import { ROBINHOOD_CHAIN } from "@config/chain";

const NOW = 1_800_000_000 as UnixSeconds;

function assetId(symbol: string): AssetId {
  return keccak256(stringToHex(`asset:${symbol}`)) as AssetId;
}

function representationId(providerId: string, symbol: string): RepresentationId {
  return keccak256(stringToHex(`rep:${providerId}:${symbol}`)) as RepresentationId;
}

function fakeToken(symbol: string): Address {
  return keccak256(stringToHex(`token:${symbol}`)).slice(0, 42) as Address;
}

function fakeFeed(symbol: string): Address {
  return keccak256(stringToHex(`feed:${symbol}`)).slice(0, 42) as Address;
}

function asset(symbol: string, name: string, assetClass: AssetClass): AssetIdentity {
  return { assetId: assetId(symbol), symbol, name, assetClass, status: "ACTIVE" };
}

function representation(symbol: string, providerId: string, decimals: number): Representation {
  return {
    representationId: representationId(providerId, symbol),
    assetId: assetId(symbol),
    providerId: providerId as ProviderId,
    chainId: ROBINHOOD_CHAIN.chainId,
    token: fakeToken(symbol),
    tokenStandard: "ERC20",
    decimals,
    multiplier: 1,
    oracle: { feed: fakeFeed(symbol), heartbeat: 3600, feedDecimals: 8 },
    status: "ACTIVE",
    createdAt: NOW,
    updatedAt: NOW,
  };
}

export const FIXTURE_ASSETS: readonly AssetIdentity[] = [
  asset("NVDA", "NVIDIA Corporation", "EQUITY"),
  asset("AAPL", "Apple Inc.", "EQUITY"),
  asset("MSFT", "Microsoft Corporation", "EQUITY"),
  asset("BTC", "Bitcoin", "CRYPTO"),
  asset("ETH", "Ether", "CRYPTO"),
];

export const FIXTURE_REPRESENTATIONS: readonly Representation[] = [
  representation("NVDA", "ROBINHOOD", 18),
  representation("AAPL", "ROBINHOOD", 18),
  representation("MSFT", "ROBINHOOD", 18),
  representation("BTC", "CRYPTO_NATIVE", 18),
  representation("ETH", "CRYPTO_NATIVE", 18),
];
