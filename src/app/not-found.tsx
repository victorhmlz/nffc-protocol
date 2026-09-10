import Link from "next/link";
import { Button, Container } from "@/components/ui";

export default function NotFound() {
  return (
    <Container className="flex min-h-dvh flex-col items-start justify-center gap-4 py-16">
      <span className="tabular text-xs text-subtle-foreground">404</span>
      <h1 className="text-xl font-semibold tracking-tight">Not found</h1>
      <p className="max-w-prose text-sm text-muted-foreground">
        That page doesn’t exist.
      </p>
      <Button asChild>
        <Link href="/">Back home</Link>
      </Button>
    </Container>
  );
}
