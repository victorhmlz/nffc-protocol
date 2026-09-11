import { describe, expect, it } from "vitest";
import { truncateAddress } from "@/lib/format-address";

describe("truncateAddress", () => {
  it("truncates a full EVM address to head…tail", () => {
    expect(truncateAddress("0x1111111111111111111111111111111111aaaa")).toBe("0x1111…aaaa");
  });

  it("leaves a short string untouched", () => {
    expect(truncateAddress("0xshort")).toBe("0xshort");
  });
});
