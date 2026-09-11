import { Button, Input } from "@/components/ui";

/**
 * A plain HTML `GET` form (TASK-28) — no client JS at all. Submitting
 * navigates the browser to `/search?q=...`, which the server renders fully
 * (`docs/spec/07-ux-map.md`: Search is "Server-first over indexed data",
 * "No" wallet needed) — the same "works without JavaScript" property a
 * search box has always had, not something this codebase needed to build.
 */
export function SearchBar({ defaultValue }: { readonly defaultValue?: string }) {
  return (
    <form action="/search" method="GET" role="search" className="flex items-center gap-2">
      <Input
        type="search"
        name="q"
        defaultValue={defaultValue}
        placeholder="Search NFFCs, assets, collections, wallets…"
        aria-label="Search"
        className="flex-1"
      />
      <Button type="submit">Search</Button>
    </form>
  );
}
