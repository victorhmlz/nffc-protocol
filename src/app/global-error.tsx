"use client";

import { useEffect } from "react";

/** Last-resort boundary — replaces the root layout when it (or something it
    renders) throws. Must render its own <html>/<body>. Deliberately dependency-
    free so it can render even if the app shell is broken. */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("global error", {
      digest: error.digest,
      message: error.message,
    });
  }, [error]);

  return (
    <html lang="en" data-theme="light">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "center",
          gap: "1rem",
          padding: "4rem 1.5rem",
          fontFamily: "ui-sans-serif, system-ui, sans-serif",
          background: "#f9f9f7",
          color: "#0b0b0b",
        }}
      >
        <h1 style={{ fontSize: "1.25rem", fontWeight: 600, margin: 0 }}>
          The application failed to load
        </h1>
        <p style={{ fontSize: "0.875rem", color: "#52514e", margin: 0 }}>
          {error.digest ? `Reference ${error.digest}. ` : ""}Please reload.
        </p>
        <button
          type="button"
          onClick={reset}
          style={{
            height: "2.25rem",
            padding: "0 1rem",
            borderRadius: "0.5rem",
            border: 0,
            background: "#2a78d6",
            color: "#fff",
            fontSize: "0.875rem",
            cursor: "pointer",
          }}
        >
          Reload
        </button>
      </body>
    </html>
  );
}
