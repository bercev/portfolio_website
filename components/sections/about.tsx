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
      className="relative scroll-mt-[calc(4rem+env(safe-area-inset-top))] py-24 sm:py-28 lg:py-36"
    >
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading title={heading} />

        <div className="mt-12 grid gap-12 lg:grid-cols-[minmax(0,1.2fr)_minmax(22rem,0.8fr)] lg:items-start lg:mt-16 lg:gap-20">
          <div className="space-y-6 text-xl leading-relaxed text-muted-foreground sm:text-2xl sm:leading-relaxed">
            {content.bio.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>

          <PortfolioCard className="lg:mt-8">
            <article>
              <p className="mb-5 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Education
              </p>
              <div className="border-b border-border pb-6">
                <h3 className="font-serif text-4xl font-extrabold leading-[0.95] tracking-[-0.03em] text-foreground">
                  {content.education.institution}
                </h3>
                <p className="mt-4 text-base text-muted-foreground">
                  {content.education.degree}
                </p>
                <div className="mt-4 flex items-baseline gap-3 text-sm text-muted-foreground">
                  <span>{content.education.dates}</span>
                  <span className="text-foreground font-semibold">
                    {content.education.gpa}
                  </span>
                </div>
              </div>

              <ul className="mt-6 flex flex-wrap gap-2">
                {content.education.coursework.map((course) => (
                  <li
                    key={course}
                    className="rounded-full border border-border bg-secondary px-3 py-1.5 text-xs text-secondary-foreground"
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
