"use client";

import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";

export function SiteHeader() {
  const { setTheme, resolvedTheme } = useTheme();
  const dark = resolvedTheme === "dark";

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b bg-background/70 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-6">
        <a href="#home" className="text-sm font-semibold tracking-tight">
          berat<span className="text-muted-foreground">.ercevik</span>
        </a>
        <nav
          className="hidden items-center gap-6 text-sm text-muted-foreground sm:flex"
          aria-label="Primary"
        >
          <a href="#about" className="transition-colors hover:text-foreground">About</a>
          <a href="#experience" className="transition-colors hover:text-foreground">Experience</a>
          <a href="#projects" className="transition-colors hover:text-foreground">Projects</a>
          <a href="#publications" className="transition-colors hover:text-foreground">Publications</a>
          <a href="#resume" className="transition-colors hover:text-foreground">Resume</a>
        </nav>
        <button
          type="button"
          aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
          onClick={() => setTheme(dark ? "light" : "dark")}
          className="flex h-9 w-9 items-center justify-center rounded-full border transition-colors hover:bg-accent"
        >
          <Sun className="hidden h-4 w-4 dark:block" />
          <Moon className="h-4 w-4 dark:hidden" />
        </button>
      </div>
    </header>
  );
}
