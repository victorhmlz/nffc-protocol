import { describe, expect, it } from "vitest";
import type { Address } from "@domain/shared/branded";
import type { LogEvent } from "@domain/ports/event-source";
import { decodeEvent, MalformedEventError } from "@domain/indexer/decode";

function log(eventName: string, args: Record<string, unknown>): LogEvent {
  return {
    address: "0x1111111111111111111111111111111111aaaa" as Address,
    blockNumber: 100n,
    logIndex: 0,
    transactionHash: "0xabc",
    transactionSender: "0x2222222222222222222222222222222222bbbb" as Address,
    eventName,
    args,
  };
}

describe("decodeEvent — recognized events", () => {
  it("decodes NFFCMinted", () => {
    const event = decodeEvent(
      log("NFFCMinted", {
        tokenId: 1n,
        collectionId: 2n,
        creator: "0xcreator",
        compositionHash: "0xhash",
        componentCount: 2,
      }),
    );
    expect(event).toEqual({
      kind: "NFFC_MINTED",
      tokenId: 1n,
      collectionId: 2n,
      creator: "0xcreator",
      compositionHash: "0xhash",
      componentCount: 2,
    });
  });

  it("decodes NFFCCompositionRecorded, including its nested components", () => {
    const event = decodeEvent(
      log("NFFCCompositionRecorded", {
        tokenId: 1n,
        components: [
          { assetId: "0xa", representationId: "0xr1", weightBps: 6000n },
          { assetId: "0xb", representationId: "0xr2", weightBps: 4000 },
        ],
      }),
    );
    expect(event).toEqual({
      kind: "NFFC_COMPOSITION_RECORDED",
      tokenId: 1n,
      components: [
        { assetId: "0xa", representationId: "0xr1", weightBps: 6000 },
        { assetId: "0xb", representationId: "0xr2", weightBps: 4000 },
      ],
    });
  });

  it("decodes Transfer", () => {
    const event = decodeEvent(log("Transfer", { from: "0xfrom", to: "0xto", tokenId: 1n }));
    expect(event).toEqual({ kind: "TRANSFER", tokenId: 1n, from: "0xfrom", to: "0xto" });
  });

  it("decodes ListingCreated", () => {
    const event = decodeEvent(log("ListingCreated", { tokenId: 1n, seller: "0xseller", price: 1000n }));
    expect(event).toEqual({ kind: "LISTING_CREATED", tokenId: 1n, seller: "0xseller", priceWei: 1000n });
  });

  it("decodes ListingCancelled", () => {
    const event = decodeEvent(log("ListingCancelled", { tokenId: 1n, seller: "0xseller" }));
    expect(event).toEqual({ kind: "LISTING_CANCELLED", tokenId: 1n, seller: "0xseller" });
  });

  it("decodes Sale", () => {
    const event = decodeEvent(
      log("Sale", { tokenId: 1n, seller: "0xseller", buyer: "0xbuyer", price: 1000n, feePaid: 50n, royaltyPaid: 25n }),
    );
    expect(event).toEqual({
      kind: "SALE",
      tokenId: 1n,
      seller: "0xseller",
      buyer: "0xbuyer",
      priceWei: 1000n,
      feePaidWei: 50n,
      royaltyPaidWei: 25n,
    });
  });

  it("decodes OfferCreated", () => {
    const event = decodeEvent(
      log("OfferCreated", { offerId: 1n, tokenId: 2n, buyer: "0xbuyer", price: 500n, expiry: 9999n }),
    );
    expect(event).toEqual({
      kind: "OFFER_CREATED",
      offerId: 1n,
      tokenId: 2n,
      buyer: "0xbuyer",
      priceWei: 500n,
      expiry: 9999n,
    });
  });

  it("decodes OfferCancelled", () => {
    expect(decodeEvent(log("OfferCancelled", { offerId: 1n }))).toEqual({ kind: "OFFER_CANCELLED", offerId: 1n });
  });

  it("decodes OfferAccepted", () => {
    const event = decodeEvent(
      log("OfferAccepted", { offerId: 1n, tokenId: 2n, seller: "0xseller", buyer: "0xbuyer", price: 500n }),
    );
    expect(event).toEqual({
      kind: "OFFER_ACCEPTED",
      offerId: 1n,
      tokenId: 2n,
      seller: "0xseller",
      buyer: "0xbuyer",
      priceWei: 500n,
    });
  });
});

describe("decodeEvent — unrecognized and malformed events", () => {
  it("returns null for an event this indexer doesn't track (e.g. Approval)", () => {
    expect(decodeEvent(log("Approval", { owner: "0xa", approved: "0xb", tokenId: 1n }))).toBeNull();
  });

  it("throws MalformedEventError when a recognized event is missing an expected field", () => {
    expect(() => decodeEvent(log("NFFCMinted", { tokenId: 1n }))).toThrow(MalformedEventError);
  });

  it("throws MalformedEventError when a field has the wrong type", () => {
    expect(() =>
      decodeEvent(log("ListingCreated", { tokenId: "not-a-bigint", seller: "0xseller", price: 1000n })),
    ).toThrow(MalformedEventError);
  });
});
