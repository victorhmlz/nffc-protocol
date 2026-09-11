import type { Portfolio } from "@domain/portfolio/portfolio";
import { NffcCard } from "@/components/market/nffc-card";

/**
 * The connected wallet's held NFFCs (TASK-25) — reuses `NffcCard` (TASK-20)
 * directly rather than a near-duplicate card: identity, segment, static
 * rarity, mint-condition, and (when actively listed) the same Buy button a
 * marketplace card shows — a holder relisting or already-listed NFFC is a
 * normal state, not a hidden one (`docs/spec/01-product-spec.md` §6.4).
 */
export function HoldingsGrid({ portfolio }: { portfolio: Portfolio }) {
  if (portfolio.holdings.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
        This wallet doesn&apos;t hold any NFFCs yet.
      </p>
    );
  }

  return (
    <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {portfolio.holdings.map((holding) => (
        <li key={holding.nffc.tokenId}>
          <NffcCard nffc={holding.nffc} />
        </li>
      ))}
    </ul>
  );
}
