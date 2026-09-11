import { describe, expect, it } from "vitest";
import type { UnixSeconds } from "@domain/shared/branded";
import type { EventContext } from "@domain/indexer/plan";
import { planWrite } from "@domain/indexer/plan";

const CTX: EventContext = {
  blockNumber: 1_000_000,
  logIndex: 3,
  txHash: "0xabc",
  blockTimestamp: 1_800_000_000 as UnixSeconds,
  transactionSender: "0xsender",
};

describe("planWrite — activity id is always the (txHash, logIndex) idempotency key", () => {
  it("builds the id as `${txHash}-${logIndex}`", () => {
    const { activity } = planWrite({ kind: "LISTING_CANCELLED", tokenId: 1n, seller: "0xseller" }, CTX);
    expect(activity!.id).toBe("0xabc-3");
  });
});

describe("planWrite — NFFC lifecycle", () => {
  it("NFFC_MINTED produces a MINT activity entry and an NFFC_MINT mirror write", () => {
    const { activity, mirror } = planWrite(
      { kind: "NFFC_MINTED", tokenId: 1n, collectionId: 2n, creator: "0xcreator", compositionHash: "0xhash", componentCount: 2 },
      CTX,
    );
    expect(activity).toMatchObject({ kind: "MINT", tokenId: "1", actorAddress: "0xcreator" });
    expect(mirror).toMatchObject({ kind: "NFFC_MINT", tokenId: 1n, collectionId: 2n, creatorAddress: "0xcreator" });
  });

  it("NFFC_COMPOSITION_RECORDED has no activity entry of its own, only the components mirror write", () => {
    const { activity, mirror } = planWrite(
      { kind: "NFFC_COMPOSITION_RECORDED", tokenId: 1n, components: [{ assetId: "0xa", representationId: "0xr", weightBps: 10_000 }] },
      CTX,
    );
    expect(activity).toBeNull();
    expect(mirror).toEqual({ kind: "NFFC_COMPONENTS", tokenId: 1n, components: [{ assetId: "0xa", representationId: "0xr", weightBps: 10_000 }] });
  });

  it("a zero-address TRANSFER (the mint's own internal transfer) produces neither an activity entry nor a mirror write", () => {
    const { activity, mirror } = planWrite(
      { kind: "TRANSFER", tokenId: 1n, from: "0x0000000000000000000000000000000000000000", to: "0xcreator" },
      CTX,
    );
    expect(activity).toBeNull();
    expect(mirror).toBeNull();
  });

  it("a real TRANSFER produces a TRANSFER activity entry and an OWNER_CHANGED mirror write", () => {
    const { activity, mirror } = planWrite({ kind: "TRANSFER", tokenId: 1n, from: "0xa", to: "0xb" }, CTX);
    expect(activity).toMatchObject({ kind: "TRANSFER", tokenId: "1", actorAddress: "0xa", counterpartyAddress: "0xb" });
    expect(mirror).toEqual({ kind: "OWNER_CHANGED", tokenId: 1n, ownerAddress: "0xb", atBlock: CTX.blockNumber });
  });
});

describe("planWrite — marketplace listings", () => {
  it("LISTING_CREATED opens a listing", () => {
    const { activity, mirror } = planWrite({ kind: "LISTING_CREATED", tokenId: 1n, seller: "0xseller", priceWei: 1000n }, CTX);
    expect(activity).toMatchObject({ kind: "LISTING_CREATED", amountWei: "1000" });
    expect(mirror).toEqual({ kind: "LISTING_OPENED", tokenId: 1n, sellerAddress: "0xseller", priceWei: "1000", atBlock: CTX.blockNumber });
  });

  it("LISTING_CANCELLED closes a listing with reason CANCELLED", () => {
    const { mirror } = planWrite({ kind: "LISTING_CANCELLED", tokenId: 1n, seller: "0xseller" }, CTX);
    expect(mirror).toEqual({ kind: "LISTING_CLOSED", tokenId: 1n, reason: "CANCELLED", atBlock: CTX.blockNumber });
  });

  it("SALE closes a listing with reason SOLD and records the sale amount, but doesn't move ownership itself", () => {
    const { activity, mirror } = planWrite(
      { kind: "SALE", tokenId: 1n, seller: "0xseller", buyer: "0xbuyer", priceWei: 1000n, feePaidWei: 50n, royaltyPaidWei: 25n },
      CTX,
    );
    expect(activity).toMatchObject({ kind: "SALE", actorAddress: "0xseller", counterpartyAddress: "0xbuyer", amountWei: "1000" });
    expect(mirror).toEqual({ kind: "LISTING_CLOSED", tokenId: 1n, reason: "SOLD", atBlock: CTX.blockNumber });
  });
});

describe("planWrite — offers", () => {
  it("OFFER_CREATED opens an offer", () => {
    const { mirror } = planWrite({ kind: "OFFER_CREATED", offerId: 1n, tokenId: 2n, buyer: "0xbuyer", priceWei: 500n, expiry: 9999n }, CTX);
    expect(mirror).toEqual({ kind: "OFFER_OPENED", offerId: 1n, tokenId: 2n, buyerAddress: "0xbuyer", priceWei: "500", expiry: 9999, atBlock: CTX.blockNumber });
  });

  it("OFFER_CANCELLED falls back to the transaction sender as the actor, and has no tokenId (the event doesn't name one)", () => {
    const { activity, mirror } = planWrite({ kind: "OFFER_CANCELLED", offerId: 1n }, CTX);
    expect(activity).toMatchObject({ kind: "OFFER_CANCELLED", actorAddress: CTX.transactionSender, tokenId: null });
    expect(mirror).toEqual({ kind: "OFFER_CLOSED", offerId: 1n, status: "CANCELLED", atBlock: CTX.blockNumber });
  });

  it("OFFER_ACCEPTED closes the offer as ACCEPTED", () => {
    const { activity, mirror } = planWrite({ kind: "OFFER_ACCEPTED", offerId: 1n, tokenId: 2n, seller: "0xseller", buyer: "0xbuyer", priceWei: 500n }, CTX);
    expect(activity).toMatchObject({ kind: "OFFER_ACCEPTED", actorAddress: "0xseller", counterpartyAddress: "0xbuyer" });
    expect(mirror).toEqual({ kind: "OFFER_CLOSED", offerId: 1n, status: "ACCEPTED", atBlock: CTX.blockNumber });
  });
});
