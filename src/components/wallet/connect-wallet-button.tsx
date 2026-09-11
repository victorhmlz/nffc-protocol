"use client";

import { useAccount, useConnect, useDisconnect } from "wagmi";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

function truncate(address: `0x${string}`): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

/**
 * Self-custody wallet connect / disconnect (TASK-16). Lists every configured
 * connector (injected — covers Robinhood Wallet and any other browser-extension
 * EVM wallet — plus WalletConnect when configured); no custodial option is ever
 * offered (`docs/spec/08-security-principles.md` A7).
 */
export function ConnectWalletButton({ className }: { className?: string }) {
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending, variables } = useConnect();
  const { disconnect } = useDisconnect();

  if (isConnected && address) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <span className="font-mono text-sm tabular-nums" title={address}>
          {truncate(address)}
        </span>
        <Button variant="outline" size="sm" onClick={() => disconnect()}>
          Disconnect
        </Button>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      {connectors.map((connector) => {
        const connectingThis = isPending && variables?.connector === connector;
        return (
          <Button
            key={connector.uid}
            variant="primary"
            size="sm"
            disabled={connectingThis}
            onClick={() => connect({ connector })}
          >
            {connectingThis ? "Connecting…" : `Connect ${connector.name}`}
          </Button>
        );
      })}
    </div>
  );
}
