import Link from "next/link";
import { Button, Container } from "@/components/ui";

/**
 * TASK-35: this copy used to say "Foundation only; product surfaces land in
 * later tasks" — stale since TASK-20 (the first real product surface). The
 * `<ThemeToggle>` this page used to carry moved to `SiteHeader`, reachable
 * everywhere now instead of only here.
 */
export default function Home() {
  return (
    <Container className="flex min-h-dvh flex-col justify-center gap-6 py-16">
      <div className="flex flex-col gap-3">
        <span className="tabular text-xs text-subtle-foreground">
          Robinhood Chain · 4663
        </span>
        <h1 className="text-3xl font-semibold tracking-tight">
          NFFC Protocol
        </h1>
        <p className="max-w-prose text-sm text-muted-foreground">
          Non-Fungible Financial Collectibles — ERC-721 tokens with an
          immutable, weighted composition of verified on-chain asset
          representations: Robinhood Stock Tokens and native crypto, one
          composition.
        </p>
      </div>
      <div className="flex flex-wrap gap-3">
        <Button asChild>
          <Link href="/market">Explore the market</Link>
        </Button>
        <Button asChild variant="secondary">
          <Link href="/create">Create an NFFC</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/style-guide">Design system</Link>
        </Button>
      </div>
    </Container>
  );
}
