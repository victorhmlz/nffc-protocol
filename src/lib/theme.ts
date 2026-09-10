/**
 * Client-side theme store. The initial theme is applied before paint by
 * `ThemeScript` (in <head>); this module lets React components read and change
 * the choice without an effect-driven setState.
 */
export type ThemeChoice = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

export const THEME_STORAGE_KEY = "nffc-theme";

function systemTheme(): ResolvedTheme {
  return typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

export function getThemeChoice(): ThemeChoice {
  if (typeof window === "undefined") return "system";
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    return stored === "light" || stored === "dark" ? stored : "system";
  } catch {
    return "system";
  }
}

export function resolveTheme(choice: ThemeChoice): ResolvedTheme {
  return choice === "system" ? systemTheme() : choice;
}

export function applyTheme(choice: ThemeChoice): void {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("data-theme", resolveTheme(choice));
}

const listeners = new Set<() => void>();
function emit(): void {
  for (const l of listeners) l();
}

export function setThemeChoice(choice: ThemeChoice): void {
  try {
    if (choice === "system") localStorage.removeItem(THEME_STORAGE_KEY);
    else localStorage.setItem(THEME_STORAGE_KEY, choice);
  } catch {
    /* storage unavailable — attribute is still applied for this session */
  }
  applyTheme(choice);
  emit();
}

/** For `useSyncExternalStore`. */
export function subscribeTheme(onChange: () => void): () => void {
  listeners.add(onChange);
  const mq =
    typeof window !== "undefined" && typeof window.matchMedia === "function"
      ? window.matchMedia("(prefers-color-scheme: dark)")
      : null;
  const onExternal = (): void => emit();
  mq?.addEventListener("change", onExternal);
  const onStorage = (e: StorageEvent): void => {
    if (e.key === THEME_STORAGE_KEY) emit();
  };
  if (typeof window !== "undefined")
    window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(onChange);
    mq?.removeEventListener("change", onExternal);
    if (typeof window !== "undefined")
      window.removeEventListener("storage", onStorage);
  };
}

export const THEME_ORDER: readonly ThemeChoice[] = ["light", "dark", "system"];
export const THEME_LABEL: Record<ThemeChoice, string> = {
  light: "Light theme",
  dark: "Dark theme",
  system: "System theme",
};
