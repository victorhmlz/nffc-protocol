import { THEME_STORAGE_KEY } from "@/lib/theme";

/**
 * Runs synchronously in <head> during HTML parsing, before first paint, so the
 * correct theme is applied with no flash and no hydration mismatch. Pattern from
 * the Next.js "Preventing Flash Before Hydration" guide.
 *
 * Resolution order: explicit choice in localStorage → OS `prefers-color-scheme`.
 * <html> ships with `data-theme="light"` + `suppressHydrationWarning`; this
 * script may rewrite the attribute before React hydrates.
 */
const script = `(function(){try{
var k=${JSON.stringify(THEME_STORAGE_KEY)};
var t=localStorage.getItem(k);
if(t!=="light"&&t!=="dark"){t=window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";}
document.documentElement.setAttribute("data-theme",t);
}catch(e){}})();`;

export function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
