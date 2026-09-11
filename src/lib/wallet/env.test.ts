import { describe, expect, it } from "vitest";
import { getWalletPublicEnv } from "@/lib/wallet/env";

describe("getWalletPublicEnv", () => {
  it("defaults to an empty RPC list and no WalletConnect project id", () => {
    expect(getWalletPublicEnv({})).toEqual({
      rpcUrls: [],
      walletConnectProjectId: undefined,
    });
  });

  it("splits and trims a comma-separated RPC list", () => {
    const env = {
      NEXT_PUBLIC_RPC_4663_URLS: " https://a.example , https://b.example",
    };
    expect(getWalletPublicEnv(env).rpcUrls).toEqual([
      "https://a.example",
      "https://b.example",
    ]);
  });

  it("drops empty entries from the RPC list", () => {
    const env = { NEXT_PUBLIC_RPC_4663_URLS: "https://a.example,,  " };
    expect(getWalletPublicEnv(env).rpcUrls).toEqual(["https://a.example"]);
  });

  it("reads the WalletConnect project id, trimmed", () => {
    const env = { NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID: " abc123 " };
    expect(getWalletPublicEnv(env).walletConnectProjectId).toBe("abc123");
  });

  it("treats a blank project id as unset", () => {
    expect(
      getWalletPublicEnv({ NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID: "   " })
        .walletConnectProjectId,
    ).toBeUndefined();
  });
});
