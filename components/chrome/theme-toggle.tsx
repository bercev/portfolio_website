"use client";

import { MoonIcon, SunIcon } from "@phosphor-icons/react";
import { useSyncExternalStore } from "react";
import { useTheme } from "next-themes";

const toggleClassName =
  "cursor-target inline-flex size-10 shrink-0 items-center justify-center rounded-full border border-border bg-background text-foreground transition-colors hover:bg-accent hover:text-accent-foreground disabled:cursor-wait";

const subscribe = () => () => undefined;

type ThemeToggleProps = {
  readonly className?: string;
  readonly menuItem?: boolean;
  readonly showLabel?: boolean;
};

function useMounted() {
  return useSyncExternalStore(subscribe, () => true, () => false);
}

export function ThemeToggle({
  className,
  menuItem = false,
  showLabel = false,
}: ThemeToggleProps) {
  const mounted = useMounted();
  const { resolvedTheme, setTheme } = useTheme();
  const resolvedClassName = className ?? toggleClassName;

  if (!mounted) {
    return (
      <button
        type="button"
        className={resolvedClassName}
        aria-label="Switch to dark theme"
        disabled
        data-bubble-menu-item={menuItem ? "" : undefined}
      >
        <span className="size-5" aria-hidden="true" />
        {showLabel ? <span>Light / Dark</span> : null}
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
      className={resolvedClassName}
      aria-label={label}
      title={label}
      data-bubble-menu-item={menuItem ? "" : undefined}
      onClick={() => setTheme(nextTheme)}
    >
      <Icon className="size-5" weight="regular" aria-hidden="true" />
      {showLabel ? <span>{isDark ? "Light mode" : "Dark mode"}</span> : null}
    </button>
  );
}
