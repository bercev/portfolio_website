"use client";

import { MoonIcon, SunIcon } from "@phosphor-icons/react";
import { useSyncExternalStore } from "react";
import { useTheme } from "next-themes";

const toggleClassName =
  "cursor-target inline-flex size-10 shrink-0 items-center justify-center rounded-full border border-border bg-background text-foreground transition-colors hover:bg-accent hover:text-accent-foreground disabled:cursor-wait";

const subscribe = () => () => undefined;

function useMounted() {
  return useSyncExternalStore(subscribe, () => true, () => false);
}

export function ThemeToggle() {
  const mounted = useMounted();
  const { resolvedTheme, setTheme } = useTheme();

  if (!mounted) {
    return (
      <button
        type="button"
        className={toggleClassName}
        aria-label="Switch to dark theme"
        disabled
      >
        <span className="size-5" aria-hidden="true" />
      </button>
    );
  }

  const isDark = resolvedTheme === "dark";
  const nextTheme = isDark ? "light" : "dark";
  const label = `Switch to ${nextTheme} theme`;
  const Icon = isDark ? SunIcon : MoonIcon;

  return (
    <button
      type="button"
      className={toggleClassName}
      aria-label={label}
      title={label}
      onClick={() => setTheme(nextTheme)}
    >
      <Icon className="size-5" weight="regular" aria-hidden="true" />
    </button>
  );
}
