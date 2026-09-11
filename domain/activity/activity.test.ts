import { describe, expect, it } from "vitest";
import type { ActivityEntry } from "@domain/nffc-detail/detail";
import { ACTIVITY_DEFAULT_PAGE_SIZE, queryActivity } from "@domain/activity/activity";

function entry(overrides: Partial<ActivityEntry> & { id: string }): ActivityEntry {
  return {
    kind: "TRANSFER",
    tokenId: "1",
    actorAddress: "0xactor",
    counterpartyAddress: null,
    amountWei: null,
    blockNumber: 100,
    txHash: "0xtx",
    occurredAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

const MINT = entry({
  id: "1",
  kind: "MINT",
  tokenId: "1",
  actorAddress: "0xaaaa",
  blockNumber: 100,
  occurredAt: "2026-01-01T00:00:00.000Z",
});
const SALE = entry({
  id: "2",
  kind: "SALE",
  tokenId: "2",
  actorAddress: "0xbbbb",
  counterpartyAddress: "0xcccc",
  amountWei: "1000000000000000000",
  blockNumber: 200,
  occurredAt: "2026-01-02T00:00:00.000Z",
});
const OFFER = entry({
  id: "3",
  kind: "OFFER_CREATED",
  tokenId: "1",
  actorAddress: "0xdddd",
  blockNumber: 300,
  occurredAt: "2026-01-03T00:00:00.000Z",
});

const ALL = [MINT, SALE, OFFER];

describe("queryActivity — sort", () => {
  it("sorts newest first by occurredAt", () => {
    const result = queryActivity(ALL, { filter: {}, page: 1, pageSize: ACTIVITY_DEFAULT_PAGE_SIZE });
    expect(result.items.map((e) => e.id)).toEqual(["3", "2", "1"]);
  });

  it("breaks ties on occurredAt by blockNumber descending", () => {
    const sameTime = "2026-01-05T00:00:00.000Z";
    const early = entry({ id: "early", occurredAt: sameTime, blockNumber: 10 });
    const late = entry({ id: "late", occurredAt: sameTime, blockNumber: 20 });
    const result = queryActivity([early, late], { filter: {}, page: 1, pageSize: ACTIVITY_DEFAULT_PAGE_SIZE });
    expect(result.items.map((e) => e.id)).toEqual(["late", "early"]);
  });
});

describe("queryActivity — filters", () => {
  it("filters by tokenId", () => {
    const result = queryActivity(ALL, { filter: { tokenId: "1" }, page: 1, pageSize: ACTIVITY_DEFAULT_PAGE_SIZE });
    expect(result.items.map((e) => e.id)).toEqual(["3", "1"]);
    expect(result.total).toBe(2);
  });

  it("filters by wallet, matching the actor", () => {
    const result = queryActivity(ALL, { filter: { wallet: "0xaaaa" }, page: 1, pageSize: ACTIVITY_DEFAULT_PAGE_SIZE });
    expect(result.items.map((e) => e.id)).toEqual(["1"]);
  });

  it("filters by wallet, matching the counterparty", () => {
    const result = queryActivity(ALL, { filter: { wallet: "0xcccc" }, page: 1, pageSize: ACTIVITY_DEFAULT_PAGE_SIZE });
    expect(result.items.map((e) => e.id)).toEqual(["2"]);
  });

  it("matches wallet case-insensitively", () => {
    const result = queryActivity(ALL, { filter: { wallet: "0xAAAA" }, page: 1, pageSize: ACTIVITY_DEFAULT_PAGE_SIZE });
    expect(result.items.map((e) => e.id)).toEqual(["1"]);
  });

  it("filters by one or more kinds", () => {
    const result = queryActivity(ALL, {
      filter: { kind: ["MINT", "OFFER_CREATED"] },
      page: 1,
      pageSize: ACTIVITY_DEFAULT_PAGE_SIZE,
    });
    expect(result.items.map((e) => e.id)).toEqual(["3", "1"]);
  });

  it("combines filters (AND, not OR)", () => {
    const result = queryActivity(ALL, {
      filter: { tokenId: "1", kind: ["MINT"] },
      page: 1,
      pageSize: ACTIVITY_DEFAULT_PAGE_SIZE,
    });
    expect(result.items.map((e) => e.id)).toEqual(["1"]);
  });

  it("an empty kind array matches everything, same as omitted", () => {
    const result = queryActivity(ALL, { filter: { kind: [] }, page: 1, pageSize: ACTIVITY_DEFAULT_PAGE_SIZE });
    expect(result.total).toBe(3);
  });
});

describe("queryActivity — pagination", () => {
  it("paginates and reports the filtered total, not the page size", () => {
    const result = queryActivity(ALL, { filter: {}, page: 1, pageSize: 2 });
    expect(result.items).toHaveLength(2);
    expect(result.total).toBe(3);
  });

  it("an out-of-range page returns an empty items array, not an error", () => {
    const result = queryActivity(ALL, { filter: {}, page: 99, pageSize: ACTIVITY_DEFAULT_PAGE_SIZE });
    expect(result.items).toEqual([]);
    expect(result.total).toBe(3);
  });

  it("clamps a non-positive or fractional page to 1", () => {
    const result = queryActivity(ALL, { filter: {}, page: 0, pageSize: ACTIVITY_DEFAULT_PAGE_SIZE });
    expect(result.page).toBe(1);
  });
});
