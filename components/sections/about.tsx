import type { PortfolioContent } from "@/data/content";

import { PortfolioCard } from "@/components/ui/portfolio-card";
import { SectionHeading } from "@/components/ui/section-heading";

type AboutProps = {
  readonly content: PortfolioContent["about"];
  readonly heading: PortfolioContent["navigation"][number]["label"];
};

export function About({ content, heading }: AboutProps) {
  return (
    <section
      id="about"
      aria-label={heading}
      className="relative scroll-mt-[calc(4rem+env(safe-area-inset-top))] py-20 sm:py-24 lg:py-32"
    >
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading title={heading} />

        <div className="mt-10 grid gap-10 md:grid-cols-[minmax(0,0.8fr)_minmax(20rem,1.2fr)] md:items-start lg:mt-14 lg:gap-16">
          <div className="space-y-5 text-lg leading-8 text-muted-foreground sm:text-xl sm:leading-9">
            {content.bio.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>

          <PortfolioCard className="md:mt-12">
            <article>
              <div className="flex flex-col gap-2 border-b border-border pb-5 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
                <div>
                  <h3 className="font-serif text-3xl leading-none tracking-[-0.025em] text-foreground">
                    {content.education.institution}
                  </h3>
                  <p className="mt-3 text-base text-muted-foreground">
                    {content.education.degree}
                  </p>
                </div>
                <div className="shrink-0 font-mono text-xs leading-5 text-muted-foreground sm:text-right">
                  <p>{content.education.dates}</p>
                  <p className="text-foreground">{content.education.gpa}</p>
                </div>
              </div>

              <ul className="mt-5 flex flex-wrap gap-2">
                {content.education.coursework.map((course) => (
                  <li
                    key={course}
                    className="rounded-full border border-border bg-secondary px-3 py-1.5 font-mono text-xs text-secondary-foreground"
                  >
                    {course}
                  </li>
                ))}
              </ul>
            </article>
          </PortfolioCard>
        </div>
      </div>
    </section>
  );
}
