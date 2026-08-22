"use client";

import { PaletteIcon } from "@phosphor-icons/react";

import { THEME_PALETTES, type ThemePalette } from "@/lib/theme-palette";
import { usePalette } from "@/components/providers/palette-provider";

export function ThemeSelector() {
  const { palette, setPalette } = usePalette();

  return (
    <label className="cursor-target inline-flex h-10 items-center gap-2 rounded-full border border-border bg-background px-3 text-foreground transition-colors hover:border-[var(--portfolio-accent)]">
      <PaletteIcon className="size-4 shrink-0" weight="regular" aria-hidden="true" />
      <span className="sr-only">Choose a color theme</span>
      <select
        value={palette}
        onChange={(event) => setPalette(event.target.value as ThemePalette)}
        className="max-w-20 cursor-pointer appearance-none bg-transparent text-xs font-semibold outline-none sm:max-w-none"
        aria-label="Choose a color theme"
      >
        {Object.entries(THEME_PALETTES).map(([name, option]) => (
          <option key={name} value={name}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
