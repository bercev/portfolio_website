import type { PortfolioContent } from "@/data/content";

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

        <div className="mt-12 grid gap-12 lg:mt-16 lg:grid-cols-[minmax(0,1.2fr)_minmax(22rem,0.8fr)] lg:items-start lg:gap-20">
          <div className="space-y-6 text-xl leading-relaxed text-muted-foreground sm:text-2xl sm:leading-relaxed">
            {content.bio.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>

          <aside
            data-education-panel
            className="border-t border-border pt-8 lg:border-l lg:border-t-0 lg:pl-10 lg:pt-0"
          >
            <p className="text-base font-semibold text-muted-foreground">
              Education
            </p>
            <h3 className="mt-4 text-[clamp(2rem,4vw,2.75rem)] font-extrabold leading-[1.05] tracking-[-0.03em] text-foreground">
              {content.education.institution}
            </h3>
            <p className="mt-5 text-lg leading-8 text-muted-foreground">
              {content.education.degree}
            </p>
            <div className="mt-5 flex flex-wrap items-baseline gap-x-5 gap-y-2 text-base text-muted-foreground">
              <span>{content.education.dates}</span>
              <span className="font-semibold text-foreground">
                {content.education.gpa}
              </span>
            </div>

            <div className="mt-8 border-t border-border pt-6">
              <p className="text-base font-semibold text-foreground">
                Selected coursework
              </p>
              <ul className="mt-4 grid gap-x-6 gap-y-3 text-base leading-7 text-muted-foreground sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                {content.education.coursework.map((course) => (
                  <li key={course}>{course}</li>
                ))}
              </ul>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
