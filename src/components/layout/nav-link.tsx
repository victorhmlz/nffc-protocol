"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

/**
 * One global-nav link (TASK-35). The only reason this is a Client Component
 * (`docs/conventions.md` §2: "Keep `use client` at the leaves") is
 * `usePathname()` for `aria-current="page"` — everything else about
 * `SiteHeader` stays a plain Server Component.
 */
export function NavLink({ href, label }: { href: string; label: string }) {
  const pathname = usePathname();
  // "/market" should also read as active on "/market?...": compare the path
  // only. An exact match, not a prefix — "/" must not light up for every route.
  const active = pathname === href;

  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "text-sm transition-colors hover:text-foreground",
        active ? "font-medium text-foreground" : "text-muted-foreground",
      )}
    >
      {label}
    </Link>
  );
}
