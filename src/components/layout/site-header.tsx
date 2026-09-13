import Link from "next/link";
import { Container } from "@/components/ui/container";
import { NavLink } from "@/components/layout/nav-link";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { ConnectWalletButton } from "@/components/wallet/connect-wallet-button";
import { NetworkBanner } from "@/components/wallet/network-banner";

const NAV_ITEMS = [
  { href: "/market", label: "Market" },
  { href: "/portfolio", label: "Portfolio" },
  { href: "/activity", label: "Activity" },
  { href: "/search", label: "Search" },
  { href: "/create", label: "Create" },
] as const;

/**
 * The one persistent, site-wide chrome (TASK-35 — `docs/OPEN_ISSUES.md`
 * Issue #13). Before this, three wallet-related widgets were each reachable
 * from only one or two pages — `NetworkBanner` and `ThemeToggle` only from
 * `/` or `/portfolio`/`/style-guide`, `ConnectWalletButton` only from
 * `/portfolio`/`/style-guide` — so a user on `/market` or `/create` had no
 * way to see they were on the wrong network, switch theme, or even see their
 * connection status. One header fixes all three, plus the complete absence
 * of navigation between top-level surfaces.
 *
 * A plain Server Component — `NavLink`/`ThemeToggle`/`ConnectWalletButton`/
 * `NetworkBanner` are the only Client leaves (`docs/conventions.md` §2:
 * "Keep `use client` at the leaves"), each already an established pattern
 * from earlier TASKs, not new here. Deliberately plain: flex-wrap links, no
 * mobile hamburger drawer — the Project Lead has flagged an upcoming
 * marketplace-layout redesign as a separate future TASK, so this stays a
 * minimal, token-only shell rather than a new piece of layout design that
 * might not survive it.
 */
export function SiteHeader() {
  return (
    <header className="border-b border-border bg-surface">
      <Container className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 py-3">
        <Link href="/" className="text-sm font-semibold tracking-tight text-foreground">
          NFFC Protocol
        </Link>
        <nav aria-label="Main" className="flex flex-wrap items-center gap-4">
          {NAV_ITEMS.map((item) => (
            <NavLink key={item.href} href={item.href} label={item.label} />
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <ConnectWalletButton />
        </div>
      </Container>
      <Container className="pb-3">
        <NetworkBanner />
      </Container>
    </header>
  );
}
