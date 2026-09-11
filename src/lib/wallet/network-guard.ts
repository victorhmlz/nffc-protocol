/**
 * Wrong-network detection (TASK-16 acceptance: "detects an incorrect network
 * automatically and offers a switch to Robinhood Chain (4663)"). The pure core
 * ({@link deriveNetworkGuardState}) is fully unit-tested; {@link useNetworkGuard}
 * is thin wagmi glue.
 */
import { useAccount, useSwitchChain } from "wagmi";
import { robinhoodChain } from "@/lib/wallet/chain";

export interface NetworkGuardState {
  /** `null` while no wallet is connected — there is nothing to warn about yet. */
  readonly currentChainId: number | null;
  readonly targetChainId: number;
  /** `false` whenever `currentChainId` is `null` (not connected → not "wrong"). */
  readonly isWrongNetwork: boolean;
}

export function deriveNetworkGuardState(
  currentChainId: number | null,
  targetChainId: number,
): NetworkGuardState {
  return {
    currentChainId,
    targetChainId,
    isWrongNetwork: currentChainId !== null && currentChainId !== targetChainId,
  };
}

export interface UseNetworkGuardResult extends NetworkGuardState {
  readonly switchToTargetChain: () => void;
  readonly isSwitching: boolean;
}

export function useNetworkGuard(): UseNetworkGuardResult {
  const { chainId, isConnected } = useAccount();
  const { switchChain, isPending } = useSwitchChain();

  const state = deriveNetworkGuardState(
    isConnected && chainId !== undefined ? chainId : null,
    robinhoodChain.id,
  );

  return {
    ...state,
    isSwitching: isPending,
    switchToTargetChain: () => switchChain({ chainId: robinhoodChain.id }),
  };
}
