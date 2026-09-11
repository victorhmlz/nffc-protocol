"use client";

import { useState, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from "wagmi";
import { wagmiConfig } from "@/lib/wallet/wagmi-config";

/**
 * The wallet/query provider boundary (TASK-16). Kept as a thin, isolated
 * Client Component at the root: everything above it (layout metadata, fonts)
 * stays Server; everything below can opt into wagmi's hooks
 * (`docs/conventions.md` §2 — Client Components only for wallet/signing).
 */
export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}
