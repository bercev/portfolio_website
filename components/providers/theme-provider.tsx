"use client";

import { ThemeProvider as NextThemesProvider, useTheme } from "next-themes";
import { useLayoutEffect } from "react";

import { PaletteProvider } from "./palette-provider";

const THEMES = ["light", "dark"];
const VALID_THEME_NAMES = new Set([...THEMES, "system"]);
const STORED_THEME_GUARD_SCRIPT = `try{var theme=localStorage.getItem("theme");if(theme!==null&&theme!=="light"&&theme!=="dark"&&theme!=="system")localStorage.setItem("theme","system")}catch(error){}`;
const STORED_PALETTE_GUARD_SCRIPT = `try{var palette=localStorage.getItem("theme-palette");var valid=["ocean","orchid","citrus","forest","rose"];if(palette==="none")delete document.documentElement.dataset.palette;else if(palette!==null&&valid.indexOf(palette)!==-1)document.documentElement.dataset.palette=palette;else if(palette!==null)localStorage.removeItem("theme-palette")}catch(error){}`;

function StoredThemeGuard() {
  const { setTheme, theme } = useTheme();

  useLayoutEffect(() => {
    if (theme !== undefined && !VALID_THEME_NAMES.has(theme)) {
      setTheme("system");
    }
  }, [setTheme, theme]);

  return null;
}

/**
 * next-themes is the single authority for resolving and applying the theme.
 * The preceding script only normalizes unsupported storage values before that
 * resolver runs; it never applies a class or reads the system color scheme.
 *
 * Both inline scripts receive the same optional nonce. See README.md before
 * enabling a strict script-src policy for the static Netlify deployment.
 */
export function ThemeProvider({
  children,
  nonce,
}: {
  children: React.ReactNode;
  nonce?: string;
}) {
  return (
    <>
      <script
        suppressHydrationWarning
        nonce={typeof window === "undefined" ? nonce : ""}
        dangerouslySetInnerHTML={{ __html: STORED_THEME_GUARD_SCRIPT }}
      />
      <script
        suppressHydrationWarning
        nonce={typeof window === "undefined" ? nonce : ""}
        dangerouslySetInnerHTML={{ __html: STORED_PALETTE_GUARD_SCRIPT }}
      />
      <NextThemesProvider
        attribute="class"
        defaultTheme="system"
        disableTransitionOnChange
        enableSystem
        nonce={nonce}
        themes={THEMES}
      >
        <StoredThemeGuard />
        <PaletteProvider>{children}</PaletteProvider>
      </NextThemesProvider>
    </>
  );
}
