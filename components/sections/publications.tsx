import Image from "next/image";

import type { PortfolioContent } from "@/data/content";

import { ExternalLink } from "@/components/ui/external-link";
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
              className="grid gap-6 border-b border-border py-8 md:grid-cols-[minmax(16rem,0.8fr)_minmax(0,1.2fr)] md:items-center md:gap-12 lg:py-12"
            >
              <div className="relative aspect-[16/10] overflow-hidden rounded-lg border border-border bg-muted">
                <Image
                  src={publication.preview.src}
                  alt={publication.preview.alt}
                  width={publication.preview.width}
                  height={publication.preview.height}
                  sizes="(min-width: 768px) 42vw, 100vw"
                  loading={index === 0 ? "eager" : "lazy"}
                  className="h-full w-full object-cover"
                />
              </div>

              <div className="flex flex-col justify-center">
                <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                  {publication.venue}
                  <span aria-hidden="true"> / </span>
                  {publication.date}
                </p>
                <h3 className="mt-4 max-w-[24ch] text-3xl font-bold leading-[1.05] tracking-[-0.025em] text-foreground sm:text-4xl">
                  <ExternalLink
                    href={publication.href}
                    className="items-start gap-2 decoration-portfolio-accent"
                  >
                    {publication.title}
                  </ExternalLink>
                </h3>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
