import type { PortfolioContent } from "@/data/content";

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

        <ol className="mt-12 border-t border-border lg:mt-16">
          {content.map((experience) => (
            <li key={`${experience.role}-${experience.dates}`}>
              <article
                data-experience-row
                className="grid gap-5 border-b border-border py-8 md:grid-cols-[minmax(11rem,0.42fr)_minmax(0,1.58fr)] md:gap-12 lg:py-12"
              >
                <header>
                  <p className="text-sm font-semibold text-muted-foreground">
                    {experience.dates}
                  </p>
                  {experience.organization ? (
                    <p className="mt-2 text-sm text-foreground">
                      {experience.organization}
                    </p>
                  ) : null}
                </header>

                <div>
                  <h3 className="text-3xl font-bold leading-none tracking-[-0.025em] text-foreground sm:text-4xl">
                    {experience.role}
                  </h3>
                  <p className="mt-5 max-w-[72ch] text-base leading-7 text-muted-foreground">
                    {experience.summary}
                  </p>
                  <p className="mt-5 text-sm leading-6 text-muted-foreground">
                    <span className="font-semibold text-foreground">Tools: </span>
                    {experience.technologies.join(", ")}
                  </p>
                </div>
              </article>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
