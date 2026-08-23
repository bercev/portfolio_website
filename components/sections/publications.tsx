import type { PortfolioContent } from "@/data/content";

import { HoverPreview } from "@/components/ui/hover-preview";
import { SectionHeading } from "@/components/ui/section-heading";

type PublicationsProps = {
  readonly content: PortfolioContent["publications"];
  readonly heading: PortfolioContent["navigation"][number]["label"];
};

export function Publications({ content, heading }: PublicationsProps) {
  return (
    <section
      id="publications"
      aria-label={heading}
      className="relative scroll-mt-[calc(4rem+env(safe-area-inset-top))] py-20 sm:py-24 lg:py-32"
    >
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading title={heading} />

        <div className="mt-12 border-t border-border lg:mt-16">
          {content.map((publication) => (
            <article
              key={publication.href}
              data-publication-row
              className="border-b border-border py-10 sm:py-12 lg:py-16"
            >
              <div className="max-w-5xl">
                <p className="text-sm font-medium uppercase tracking-[0.12em] text-muted-foreground">
                  {publication.venue}
                  <span aria-hidden="true"> / </span>
                  {publication.date}
                </p>
                <HoverPreview
                  title={publication.title}
                  href={publication.href}
                  pdfUrl={publication.pdfUrl}
                  headingClassName="mt-4 w-full max-w-[32ch] text-3xl font-bold leading-[1.05] tracking-[-0.025em] text-foreground sm:text-4xl"
                  linkClassName="w-full items-start gap-2 decoration-portfolio-accent"
                  linkIconSize={24}
                />
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
