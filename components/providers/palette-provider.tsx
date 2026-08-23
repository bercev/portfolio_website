"use client";

import { createContext, useContext, useLayoutEffect, useState } from "react";

import { isThemePalette, type ThemePalette } from "@/lib/theme-palette";

const STORAGE_KEY = "theme-palette";
const NO_PALETTE_VALUE = "none";
const DEFAULT_PALETTE: ThemePalette = "ocean";
export type PaletteSelection = ThemePalette | null;

function getInitialPalette(): PaletteSelection {
  if (typeof document !== "undefined" && isThemePalette(document.documentElement.dataset.palette)) {
    return document.documentElement.dataset.palette;
  }
  if (typeof window !== "undefined") {
    try {
      if (window.localStorage.getItem(STORAGE_KEY) === NO_PALETTE_VALUE) {
        return null;
      }
    } catch {
      // Fall back to the default when persistence is unavailable.
    }
  }
  return DEFAULT_PALETTE;
}

const PaletteContext = createContext<{
  palette: PaletteSelection;
  setPalette: (palette: PaletteSelection) => void;
}>({
  palette: DEFAULT_PALETTE,
  setPalette: () => undefined,
});

export function PaletteProvider({ children }: { children: React.ReactNode }) {
  const [palette, setPaletteState] =
    useState<PaletteSelection>(getInitialPalette);

  useLayoutEffect(() => {
    if (palette === null) {
      delete document.documentElement.dataset.palette;
    } else {
      document.documentElement.dataset.palette = palette;
    }
  }, [palette]);

  const setPalette = (nextPalette: PaletteSelection) => {
    setPaletteState(nextPalette);
    if (nextPalette === null) {
      delete document.documentElement.dataset.palette;
    } else {
      document.documentElement.dataset.palette = nextPalette;
    }
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        nextPalette ?? NO_PALETTE_VALUE,
      );
    } catch {
      // Keep the current session usable when persistence is unavailable.
    }
  };

  return <PaletteContext.Provider value={{ palette, setPalette }}>{children}</PaletteContext.Provider>;
}

export function usePalette() {
  return useContext(PaletteContext);
}
