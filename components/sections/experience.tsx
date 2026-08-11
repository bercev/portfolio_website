import type { PortfolioContent } from "@/data/content";

import { PortfolioCard } from "@/components/ui/portfolio-card";
import { SectionHeading } from "@/components/ui/section-heading";

type ExperienceProps = {
  readonly content: PortfolioContent["experience"];
  readonly heading: PortfolioContent["navigation"][number]["label"];
};

export function Experience({ content, heading }: ExperienceProps) {
  return (
    <section
      id="experience"
      aria-label={heading}
      className="relative scroll-mt-[calc(4rem+env(safe-area-inset-top))] py-20 sm:py-24 lg:py-32"
    >
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading title={heading} />

        <ol className="mt-10 space-y-5 lg:mt-14 lg:space-y-6">
          {content.map((experience, index) => (
            <li
              key={`${experience.role}-${experience.dates}`}
              className={index % 2 === 1 ? "md:ml-[8.333%]" : "md:mr-[8.333%]"}
            >
              <PortfolioCard>
                <article className="grid gap-5 md:grid-cols-[minmax(14rem,0.72fr)_minmax(0,1.28fr)] md:gap-10">
                  <header>
                    <p className="font-mono text-xs text-muted-foreground">
                      {experience.dates}
                    </p>
                    <h3 className="mt-2 font-serif text-3xl leading-none tracking-[-0.025em] text-foreground">
                      {experience.role}
                    </h3>
                    {experience.organization ? (
                      <p className="mt-3 text-sm font-semibold text-foreground">
                        {experience.organization}
                      </p>
                    ) : null}
                  </header>

                  <div>
                    <p className="max-w-[68ch] text-sm leading-6 text-muted-foreground sm:text-base sm:leading-7">
                      {experience.summary}
                    </p>
                    <ul className="mt-5 flex flex-wrap gap-2">
                      {experience.technologies.map((technology) => (
                        <li
                          key={technology}
                          className="rounded-full border border-border bg-secondary px-3 py-1.5 font-mono text-xs text-secondary-foreground"
                        >
                          {technology}
                        </li>
                      ))}
                    </ul>
                  </div>
                </article>
              </PortfolioCard>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
