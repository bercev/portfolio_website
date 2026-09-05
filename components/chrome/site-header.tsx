"use client";

import { ThemeToggle } from "@/components/chrome/theme-toggle";
import { portfolio } from "@/data/content";

export function SiteHeader() {
  return (
    <header className="journey-masthead">
      <div className="journey-measure journey-masthead-inner">
        <a
          href="#home"
          className="cursor-target journey-wordmark"
          aria-label={`${portfolio.identity.name}, home`}
        >
          <span className="journey-wordmark-given">Berat</span>{" "}
          <span className="journey-wordmark-family">Ercevik</span>
        </a>
        <div className="journey-masthead-actions">
          <p className="journey-masthead-role">{portfolio.identity.role}</p>
          <ThemeToggle className="cursor-target journey-masthead-toggle" />
        </div>
      </div>
    </header>
  );
}
