"use client";

import { useEffect, useSyncExternalStore } from "react";
import { Monitor, MoonStar, Sun } from "lucide-react";
import { cn } from "@/lib/cn";
import {
  THEME_LABEL,
  THEME_ORDER,
  type ThemeChoice,
  applyTheme,
  getThemeChoice,
  setThemeChoice,
  subscribeTheme,
} from "@/lib/theme";

const ICON = { light: Sun, dark: MoonStar, system: Monitor } as const;

/** Cycles light → dark → system. State lives in the theme store, not React. */
export function ThemeToggle({ className }: { className?: string }) {
  const choice = useSyncExternalStore<ThemeChoice>(
    subscribeTheme,
    getThemeChoice,
    () => "system",
  );

  // Keep the <html> attribute in sync — covers the system-preference change
  // while in "system" mode, and React clearing the attribute on the dev
  // Strict-Mode remount. External-system sync only, no setState.
  useEffect(() => {
    applyTheme(choice);
  }, [choice]);

  const Icon = ICON[choice];
  const next =
    THEME_ORDER[(THEME_ORDER.indexOf(choice) + 1) % THEME_ORDER.length] ??
    "system";

  return (
    <button
      type="button"
      aria-label={`${THEME_LABEL[choice]}. Activate for ${THEME_LABEL[next].toLowerCase()}.`}
      onClick={() => setThemeChoice(next)}
      className={cn(
        "inline-flex size-9 items-center justify-center rounded-md border border-border",
        "bg-surface text-muted-foreground transition-colors duration-[var(--duration-fast)]",
        "hover:bg-accent hover:text-accent-foreground",
        className,
      )}
    >
      <Icon className="size-4" aria-hidden />
    </button>
  );
}
