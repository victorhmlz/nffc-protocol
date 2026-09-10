import Link from "next/link";
import { Button, Container } from "@/components/ui";
import { ThemeToggle } from "@/components/theme/theme-toggle";

export default function Home() {
  return (
    <Container className="flex min-h-dvh flex-col justify-center gap-6 py-16">
      <div className="flex items-start justify-between gap-4">
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
            representations. Foundation only; product surfaces land in later
            tasks.
          </p>
        </div>
        <ThemeToggle />
      </div>
      <div className="flex gap-3">
        <Button asChild>
          <Link href="/style-guide">Design system</Link>
        </Button>
        <Button asChild variant="secondary">
          <Link href="/api/health">Health</Link>
        </Button>
      </div>
    </Container>
  );
}
