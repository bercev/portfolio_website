import type { PortfolioContent } from "@/data/content";

import { ProfileActions } from "@/components/chrome/profile-actions";
import { ThemeToggle } from "@/components/chrome/theme-toggle";
import { ThemeSelector } from "@/components/chrome/theme-selector";

export function SiteHeader({
  links,
}: {
  links: PortfolioContent["contact"]["links"];
}) {
  return (
    <header className="fixed inset-x-0 top-0 z-[var(--z-site-header)] border-b border-border/60 bg-background/80 pt-[env(safe-area-inset-top)] backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] sm:pl-[max(1.5rem,env(safe-area-inset-left))] sm:pr-[max(1.5rem,env(safe-area-inset-right))] lg:pl-[max(2rem,env(safe-area-inset-left))] lg:pr-[max(2rem,env(safe-area-inset-right))]">
        <a
          href="#home"
          className="cursor-target inline-flex size-10 items-center justify-center rounded-[var(--radius)] font-serif text-base font-extrabold tracking-tight text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          aria-label="Berat Ercevik, home"
        >
          BE
        </a>
        <div className="flex items-center gap-1">
          <ProfileActions links={links} />
          <ThemeSelector />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
