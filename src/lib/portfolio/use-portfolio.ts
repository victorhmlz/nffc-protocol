"use client";

/**
 * Fetches the connected wallet's portfolio (TASK-25) from
 * `/api/portfolio/[address]`. `/portfolio` has no URL segment to server-render
 * against — wallet identity only exists client-side in this self-custody
 * DApp — so unlike `/nffc/[tokenId]`'s SSR fetch, this is a client effect keyed
 * on the connected address, the same "Client Component, explicit
 * loading/error state" shape `useMarketplaceActionFlow`/`useMintFlow` (TASK-18/20) already
 * establish for wallet-driven data.
 *
 * Uses `useReducer`, not a handful of `useState` calls — `transaction-flow.ts`
 * (TASK-16) already establishes `dispatch(...)` as the accepted way to
 * synchronize state from inside an effect in this codebase
 * (`react-hooks/set-state-in-effect` flags a bare `useState` setter called
 * directly in an effect body, even for the ordinary "start loading" case).
 */
import { useEffect, useReducer } from "react";
import type { Portfolio } from "@domain/portfolio/portfolio";

export interface UsePortfolioResult {
  readonly portfolio: Portfolio | null;
  readonly loading: boolean;
  readonly error: string | null;
}

type State = UsePortfolioResult;

type Action =
  | { readonly type: "FETCH_START" }
  | { readonly type: "FETCH_SUCCESS"; readonly portfolio: Portfolio }
  | { readonly type: "FETCH_ERROR"; readonly error: string };

const INITIAL_STATE: State = { portfolio: null, loading: false, error: null };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "FETCH_START":
      return { portfolio: null, loading: true, error: null };
    case "FETCH_SUCCESS":
      return { portfolio: action.portfolio, loading: false, error: null };
    case "FETCH_ERROR":
      return { portfolio: null, loading: false, error: action.error };
  }
}

export function usePortfolio(address: `0x${string}` | undefined): UsePortfolioResult {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE);

  useEffect(() => {
    if (!address) return; // nothing to synchronize; the return below reports the cleared view directly

    let cancelled = false;
    dispatch({ type: "FETCH_START" });

    void (async () => {
      try {
        const res = await fetch(`/api/portfolio/${address}`);
        if (!res.ok) throw new Error(`Failed to load portfolio (${res.status}).`);
        const data = (await res.json()) as Portfolio;
        if (!cancelled) dispatch({ type: "FETCH_SUCCESS", portfolio: data });
      } catch (err) {
        if (!cancelled) {
          dispatch({
            type: "FETCH_ERROR",
            error: err instanceof Error ? err.message : "Failed to load portfolio.",
          });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [address]);

  // No address: report the cleared view directly, without a matching effect
  // branch that would just be resetting derivable state.
  if (!address) return INITIAL_STATE;
  return state;
}
