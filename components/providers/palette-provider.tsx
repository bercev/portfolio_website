"use client";

import { createContext, useContext, useLayoutEffect, useState } from "react";

import { isThemePalette, type ThemePalette } from "@/lib/theme-palette";

const STORAGE_KEY = "theme-palette";
const DEFAULT_PALETTE: ThemePalette = "ocean";

function getInitialPalette(): ThemePalette {
  if (typeof document !== "undefined" && isThemePalette(document.documentElement.dataset.palette)) {
    return document.documentElement.dataset.palette;
  }
  return DEFAULT_PALETTE;
}

const PaletteContext = createContext<{
  palette: ThemePalette;
  setPalette: (palette: ThemePalette) => void;
}>({
  palette: DEFAULT_PALETTE,
  setPalette: () => undefined,
});

export function PaletteProvider({ children }: { children: React.ReactNode }) {
  const [palette, setPaletteState] = useState<ThemePalette>(getInitialPalette);

  useLayoutEffect(() => {
    document.documentElement.dataset.palette = palette;
  }, [palette]);

  const setPalette = (nextPalette: ThemePalette) => {
    setPaletteState(nextPalette);
    document.documentElement.dataset.palette = nextPalette;
    try {
      window.localStorage.setItem(STORAGE_KEY, nextPalette);
    } catch {
      // Keep the current session usable when persistence is unavailable.
    }
  };

  return <PaletteContext.Provider value={{ palette, setPalette }}>{children}</PaletteContext.Provider>;
}

export function usePalette() {
  return useContext(PaletteContext);
}
