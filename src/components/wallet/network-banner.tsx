"use client";

import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNetworkGuard } from "@/lib/wallet/network-guard";
import { cn } from "@/lib/cn";

/**
 * Automatic wrong-network detection with a one-click switch to Robinhood Chain
 * (TASK-16 acceptance). Renders nothing when disconnected or already on the
 * right chain — never a false warning.
 */
export function NetworkBanner({ className }: { className?: string }) {
  const {
    isWrongNetwork,
    currentChainId,
    targetChainId,
    switchToTargetChain,
    isSwitching,
  } = useNetworkGuard();

  if (!isWrongNetwork) return null;

  return (
    <div
      role="alert"
      className={cn(
        "flex items-center gap-3 rounded-md border border-border bg-status-warning/15 p-3",
        className,
      )}
    >
      <AlertTriangle aria-hidden className="size-4 shrink-0 text-foreground" />
      <p className="flex-1 text-sm text-foreground">
        Wrong network — connected to chain {currentChainId}. This app runs on
        Robinhood Chain ({targetChainId}).
      </p>
      <Button
        variant="secondary"
        size="sm"
        onClick={switchToTargetChain}
        disabled={isSwitching}
      >
        {isSwitching ? "Switching…" : "Switch network"}
      </Button>
    </div>
  );
}
