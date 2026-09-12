import Link from "next/link";

const LINKS = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/assets", label: "Assets" },
  { href: "/admin/representations", label: "Representations" },
  { href: "/admin/fees", label: "Fees" },
  { href: "/admin/collections", label: "Collections" },
  { href: "/admin/reports", label: "Reports" },
] as const;

export function AdminNav() {
  return (
    <nav aria-label="Admin sections" className="flex flex-wrap gap-2 border-b border-border pb-4">
      {LINKS.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          className="rounded-md px-3 py-1.5 text-sm font-medium text-subtle-foreground hover:bg-muted hover:text-foreground"
        >
          {l.label}
        </Link>
      ))}
    </nav>
  );
}
