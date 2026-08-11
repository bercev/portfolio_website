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
      <footer className="border-t border-border bg-background/70 backdrop-blur-sm">
        <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 pb-[max(7rem,calc(5rem+env(safe-area-inset-bottom)))] pt-12 sm:px-6 sm:pt-16 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end lg:gap-16 lg:px-8 lg:pt-20">
          <div>
            <SectionHeading title={content.heading} />
            <p className="mt-5 max-w-[52ch] text-base leading-7 text-muted-foreground sm:text-lg">
              {content.message}
            </p>
          </div>

          <nav aria-label={content.heading}>
            <ul className="flex flex-wrap gap-3 lg:justify-end">
              {content.links.map((link) => (
                <li key={link.href}>
                  <ExternalLink
                    href={link.href}
                    download={link.download}
                    className="min-h-11 rounded-full border border-border bg-card px-5 font-mono text-sm font-semibold text-card-foreground no-underline transition-transform hover:-translate-y-0.5 hover:text-card-foreground hover:no-underline active:translate-y-px"
                  >
                    {link.label}
                  </ExternalLink>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </footer>
    </section>
  );
}
