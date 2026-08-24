import type { PortfolioContent } from "@/data/content";

import { ExternalLink } from "@/components/ui/external-link";
import { SectionHeading } from "@/components/ui/section-heading";

export function ContactFooter({
  content,
}: {
  content: PortfolioContent["contact"];
}) {
  return (
    <section
      id="contact"
      aria-label={content.heading}
      className="relative scroll-mt-[calc(4rem+env(safe-area-inset-top))] pt-20 sm:pt-24 lg:pt-32"
    >
      <footer className="border-t border-border">
        <div className="mx-auto w-full max-w-7xl px-4 pb-[max(7rem,calc(5rem+env(safe-area-inset-bottom)))] pt-12 sm:px-6 sm:pt-16 lg:px-8 lg:pt-20">
          <div>
            <SectionHeading title={content.heading} />
            <p className="mt-6 max-w-[52ch] text-lg leading-8 text-muted-foreground">
              {content.message}
            </p>
          </div>

          <nav aria-label="Profile links" className="mt-10 sm:mt-12">
            <ul className="flex flex-wrap items-baseline gap-x-10 gap-y-4">
              {content.links.map((link) => {
                const label = link.label;
                return (
                  <li key={label}>
                    {link.download ? (
                      <a
                        href={link.href}
                        download
                        className="cursor-target inline-flex items-baseline gap-2 text-3xl font-extrabold tracking-[-0.02em] text-foreground transition-transform hover:-translate-y-0.5 active:translate-y-px sm:text-4xl"
                      >
                        <span className="decoration-portfolio-accent underline-offset-8 group-hover:underline">
                          {label}
                        </span>
                        <span
                          aria-hidden="true"
                          className="text-portfolio-accent text-2xl sm:text-3xl"
                        >
                          ↓
                        </span>
                      </a>
                    ) : (
                      <ExternalLink
                        href={link.href}
                        iconSize={28}
                        className="text-3xl font-extrabold tracking-[-0.02em] text-foreground sm:text-4xl [&>span:first-child]:underline-offset-8 [&>span:first-child]:decoration-portfolio-accent [&>span:first-child]:hover:underline"
                      >
                        {label}
                      </ExternalLink>
                    )}
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>
      </footer>
    </section>
  );
}
