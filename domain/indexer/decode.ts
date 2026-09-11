/**
 * `LogEvent` (`domain/ports/event-source.ts`) → `IndexedEvent`
 * (`domain/indexer/events.ts`). Pure: no I/O, no chain access — the ABI
 * decoding into `args` already happened at the `BlockchainEventSource`
 * boundary (`workers/indexer/onchain.ts`, untested real glue); this only
 * validates and reshapes an already-decoded record into a typed event.
 *
 * Returns `null` for any event name this indexer doesn't track (e.g.
 * ERC-721 `Approval`) — an unrecognized event is silently skipped, not an
 * error, since a contract can emit events no indexer version yet knows
 * about without that breaking ingestion of the ones it does.
 */
import type { LogEvent } from "@domain/ports/event-source";
import type { IndexedEvent, NffcCompositionComponent } from "@domain/indexer/events";

export class MalformedEventError extends Error {
  override name = "MalformedEventError";
  constructor(eventName: string, reason: string) {
    super(`Malformed "${eventName}" event: ${reason}`);
  }
}

function str(args: Readonly<Record<string, unknown>>, key: string, eventName: string): string {
  const v = args[key];
  if (typeof v !== "string") throw new MalformedEventError(eventName, `"${key}" is not a string`);
  return v;
}

function big(args: Readonly<Record<string, unknown>>, key: string, eventName: string): bigint {
  const v = args[key];
  if (typeof v !== "bigint") throw new MalformedEventError(eventName, `"${key}" is not a bigint`);
  return v;
}

function num(args: Readonly<Record<string, unknown>>, key: string, eventName: string): number {
  const v = args[key];
  if (typeof v === "number") return v;
  if (typeof v === "bigint") return Number(v);
  throw new MalformedEventError(eventName, `"${key}" is not a number`);
}

function components(args: Readonly<Record<string, unknown>>, eventName: string): readonly NffcCompositionComponent[] {
  const v = args.components;
  if (!Array.isArray(v)) throw new MalformedEventError(eventName, `"components" is not an array`);
  return v.map((c, i) => {
    if (typeof c !== "object" || c === null) {
      throw new MalformedEventError(eventName, `components[${i}] is not an object`);
    }
    const rec = c as Record<string, unknown>;
    return {
      assetId: str(rec, "assetId", eventName),
      representationId: str(rec, "representationId", eventName),
      weightBps: num(rec, "weightBps", eventName),
    };
  });
}

export function decodeEvent(log: LogEvent): IndexedEvent | null {
  const { eventName, args } = log;

  switch (eventName) {
    case "NFFCMinted":
      return {
        kind: "NFFC_MINTED",
        tokenId: big(args, "tokenId", eventName),
        collectionId: big(args, "collectionId", eventName),
        creator: str(args, "creator", eventName),
        compositionHash: str(args, "compositionHash", eventName),
        componentCount: num(args, "componentCount", eventName),
      };

    case "NFFCCompositionRecorded":
      return {
        kind: "NFFC_COMPOSITION_RECORDED",
        tokenId: big(args, "tokenId", eventName),
        components: components(args, eventName),
      };

    case "Transfer":
      return {
        kind: "TRANSFER",
        tokenId: big(args, "tokenId", eventName),
        from: str(args, "from", eventName),
        to: str(args, "to", eventName),
      };

    case "ListingCreated":
      return {
        kind: "LISTING_CREATED",
        tokenId: big(args, "tokenId", eventName),
        seller: str(args, "seller", eventName),
        priceWei: big(args, "price", eventName),
      };

    case "ListingCancelled":
      return {
        kind: "LISTING_CANCELLED",
        tokenId: big(args, "tokenId", eventName),
        seller: str(args, "seller", eventName),
      };

    case "Sale":
      return {
        kind: "SALE",
        tokenId: big(args, "tokenId", eventName),
        seller: str(args, "seller", eventName),
        buyer: str(args, "buyer", eventName),
        priceWei: big(args, "price", eventName),
        feePaidWei: big(args, "feePaid", eventName),
        royaltyPaidWei: big(args, "royaltyPaid", eventName),
      };

    case "OfferCreated":
      return {
        kind: "OFFER_CREATED",
        offerId: big(args, "offerId", eventName),
        tokenId: big(args, "tokenId", eventName),
        buyer: str(args, "buyer", eventName),
        priceWei: big(args, "price", eventName),
        expiry: big(args, "expiry", eventName),
      };

    case "OfferCancelled":
      return { kind: "OFFER_CANCELLED", offerId: big(args, "offerId", eventName) };

    case "OfferAccepted":
      return {
        kind: "OFFER_ACCEPTED",
        offerId: big(args, "offerId", eventName),
        tokenId: big(args, "tokenId", eventName),
        seller: str(args, "seller", eventName),
        buyer: str(args, "buyer", eventName),
        priceWei: big(args, "price", eventName),
      };

    default:
      return null;
  }
}
