/**
 * The same "no price/NAV engine yet" snapshot `/api/nffc/[tokenId]/market`
 * returns (TASK-11; real engines are TASK-22/23) — reused directly by the
 * detail page's SSR fetch rather than the page self-fetching its own API
 * route. `async` (even with nothing to await yet) to match the shape a real
 * engine call will have, and to keep `Date.now()` out of the page component's
 * render body (`react-hooks/purity` — Server Component render must stay a
 * pure function of its data-fetch calls).
 */
import { emptyMarketSnapshot, type NffcMarketSnapshot } from "@domain/metadata/metadata";

export async function getNffcMarketSnapshot(tokenId: string): Promise<NffcMarketSnapshot> {
  const asOf = Math.floor(Date.now() / 1000);
  return emptyMarketSnapshot(
    tokenId,
    asOf,
    "Reference NAV and prices are available once the price and NAV engines are deployed (TASK-22/23).",
  );
}
