import Image from "next/image";

import type { PortfolioContent } from "@/data/content";

import { ExternalLink } from "@/components/ui/external-link";
import { PortfolioCard } from "@/components/ui/portfolio-card";
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

        <div className="mt-10 grid gap-5 md:grid-cols-2 lg:mt-14 lg:gap-7">
          {content.map((publication, index) => (
            <PortfolioCard
              key={publication.href}
              className={index === 1 ? "md:mt-10" : undefined}
            >
              <article className="flex h-full flex-col">
                <div className="relative aspect-[16/10] overflow-hidden rounded-lg border border-border bg-muted">
                  <Image
                    src={publication.preview.src}
                    alt={publication.preview.alt}
                    width={publication.preview.width}
                    height={publication.preview.height}
                    sizes="(min-width: 768px) 50vw, 100vw"
                    loading={index === 0 ? "eager" : "lazy"}
                    className="h-full w-full object-cover"
                  />
                </div>

                <div className="flex flex-1 flex-col pt-6">
                  <p className="font-mono text-xs text-muted-foreground">
                    {publication.venue}
                    <span aria-hidden="true"> / </span>
                    {publication.date}
                  </p>
                  <h3 className="mt-3 font-serif text-2xl leading-[1.05] tracking-[-0.02em] text-foreground sm:text-3xl">
                    <ExternalLink
                      href={publication.href}
                      className="items-start gap-2 decoration-portfolio-accent"
                    >
                      {publication.title}
                    </ExternalLink>
                  </h3>
                </div>
              </article>
            </PortfolioCard>
          ))}
        </div>
      </div>
    </section>
  );
}
