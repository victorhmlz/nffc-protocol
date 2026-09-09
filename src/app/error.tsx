"use client";

import { useEffect } from "react";
import { Button, Container } from "@/components/ui";

/** Route-segment error boundary. Catches render/data errors below the root layout. */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Client-side; a server logger isn't available here. TASK-33/34 route this
    // to the shared error vocabulary + observability.
    console.error("route error", {
      digest: error.digest,
      message: error.message,
    });
  }, [error]);

  return (
    <Container className="flex min-h-dvh flex-col items-start justify-center gap-4 py-16">
      <span className="tabular text-xs text-subtle-foreground">
        Error{error.digest ? ` · ${error.digest}` : ""}
      </span>
      <h1 className="text-xl font-semibold tracking-tight">
        Something went wrong
      </h1>
      <p className="max-w-prose text-sm text-muted-foreground">
        This view failed to load. The rest of the app is unaffected.
      </p>
      <Button onClick={reset}>Try again</Button>
    </Container>
  );
}
