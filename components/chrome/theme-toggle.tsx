"use client";

import { MoonIcon, SunIcon } from "@phosphor-icons/react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { useTheme } from "next-themes";

import { useAsciiActive } from "@/lib/use-ascii-active";
import { usePrefersReducedMotion } from "@/lib/use-prefers-reduced-motion";

const toggleClassName =
  "cursor-target inline-flex size-10 shrink-0 items-center justify-center rounded-full border border-border bg-background text-foreground transition-colors hover:bg-accent hover:text-accent-foreground disabled:cursor-wait";

type ThemeToggleProps = {
  readonly className?: string;
  readonly menuItem?: boolean;
  readonly showLabel?: boolean;
};

export function ThemeToggle({
  className,
  menuItem = false,
  showLabel = false,
}: ThemeToggleProps) {
  const [mounted, setMounted] = useState(false);
  const { resolvedTheme, setTheme } = useTheme();
  // While the ASCII scene runs, the FROST remap locks light/dark tokens to
  // dark, so this toggle is a no-op there: show it dimmed and disabled with
  // the reason, instead of a clickable control that changes nothing.
  const asciiActive = useAsciiActive();
  const resolvedClassName = className ?? toggleClassName;
  // R17: crossfade the Sun/Moon icons with a slight blur instead of a
  // hard swap. Reduced motion = instant swap (duration 0, no blur).
  const shouldReduceMotion = usePrefersReducedMotion();

  useEffect(() => {
    // Intentional mount guard (standard next-themes pattern): avoids hydration
    // mismatch by rendering the placeholder until the client mounts.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

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
      className={`${resolvedClassName}${asciiActive ? " opacity-50" : ""}`}
      aria-label={label}
      title={
        asciiActive
          ? "Light/dark locked while the ASCII scene runs"
          : label
      }
      disabled={asciiActive}
      data-bubble-menu-item={menuItem ? "" : undefined}
      onClick={() => setTheme(nextTheme)}
    >
      <span className="relative size-5" aria-hidden="true">
        <AnimatePresence initial={false}>
          <motion.span
            key={isDark ? "sun" : "moon"}
            className="absolute inset-0 flex items-center justify-center"
            initial={
              shouldReduceMotion
                ? { opacity: 0 }
                : { opacity: 0, filter: "blur(2px)" }
            }
            animate={{
              opacity: 1,
              filter: "blur(0px)",
              transition: {
                duration: shouldReduceMotion ? 0 : 0.18,
                ease: [0.16, 1, 0.3, 1],
              },
            }}
            exit={
              shouldReduceMotion
                ? { opacity: 0, transition: { duration: 0 } }
                : {
                    opacity: 0,
                    filter: "blur(2px)",
                    transition: {
                      duration: 0.18,
                      ease: [0.16, 1, 0.3, 1],
                    },
                  }
            }
          >
            <Icon className="size-5" weight="regular" aria-hidden="true" />
          </motion.span>
        </AnimatePresence>
      </span>
      {showLabel ? <span>{isDark ? "Light mode" : "Dark mode"}</span> : null}
    </button>
  );
}
