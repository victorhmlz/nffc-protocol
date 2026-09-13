import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Inter, JetBrains_Mono } from "next/font/google";
import { ThemeScript } from "@/components/theme/theme-script";
import { SiteHeader } from "@/components/layout/site-header";
import { Providers } from "@/app/providers";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "NFFC Protocol",
    template: "%s · NFFC Protocol",
  },
  description: "Non-Fungible Financial Collectibles",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      data-theme="light"
      suppressHydrationWarning
      className={`${inter.variable} ${jetbrainsMono.variable}`}
    >
      <head>
        <ThemeScript />
      </head>
      <body>
        <Providers>
          {/* TASK-34: no page in this codebase had a `<main>` landmark —
              every route's content sat directly in `<body>` with no
              structural region a screen reader could jump to. One wrapper
              here covers every route; a page's own `<header>`/`<h1>` nests
              inside it without conflict.
              TASK-35: `SiteHeader` is the one persistent, site-wide chrome —
              before this, NetworkBanner/ThemeToggle/ConnectWalletButton were
              each reachable from only one or two pages, and there was no
              navigation between top-level surfaces at all
              (`docs/OPEN_ISSUES.md` Issue #13). */}
          <SiteHeader />
          <main>{children}</main>
        </Providers>
      </body>
    </html>
  );
}
