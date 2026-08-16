import type { PortfolioContent } from "@/data/content";

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
        <div className="mx-auto w-full max-w-7xl px-4 pb-[max(7rem,calc(5rem+env(safe-area-inset-bottom)))] pt-12 sm:px-6 sm:pt-16 lg:px-8 lg:pt-20">
          <div>
            <SectionHeading title={content.heading} />
            <p className="mt-6 max-w-[52ch] text-lg leading-8 text-muted-foreground">
              {content.message}
            </p>
          </div>
        </div>
      </footer>
    </section>
  );
}
