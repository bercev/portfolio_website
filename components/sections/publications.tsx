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
          {content.map((publication, index) => (
            <article
              key={publication.href}
              data-publication-row
              className="border-b border-border py-10 sm:py-12 lg:py-16"
            >
              <div className="flex max-w-5xl flex-col justify-center">
                <p className="text-sm font-medium uppercase tracking-[0.12em] text-muted-foreground">
                  {publication.venue}
                  <span aria-hidden="true"> / </span>
                  {publication.date}
                </p>
                <h3 className="mt-4 w-full max-w-[32ch] text-3xl font-bold leading-[1.05] tracking-[-0.025em] text-foreground sm:text-4xl">
                  <HoverPreview
                    href={publication.href}
                    imageUrl={publication.preview.src}
                    imageWidth={publication.preview.width}
                    imageHeight={publication.preview.height}
                    rotation={index % 2 === 0 ? -2 : 2}
                    className="w-full items-start gap-2 decoration-portfolio-accent"
                  >
                    {publication.title}
                  </HoverPreview>
                </h3>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
