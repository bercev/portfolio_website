import type { PortfolioContent } from "@/data/content";

import { Station } from "@/components/ui/station";

type AboutProps = {
  readonly content: PortfolioContent["about"];
  readonly heading: PortfolioContent["navigation"][number]["label"];
};

export function About({ content, heading }: AboutProps) {
  const { education } = content;
  const beat = "UCSC CS · 4.0 · building AI systems";

  return (
    <Station
      id="about"
      station={2}
      beat={beat}
      heading={heading}
      className="journey-station--origin"
    >
      <div className="journey-about-column">
        <div className="journey-copy">
          {content.bio.map((paragraph, index) => (
            <p
              key={paragraph}
              className={
                index === 0
                  ? "journey-body journey-body--lede"
                  : "journey-body"
              }
            >
              {paragraph}
            </p>
          ))}
        </div>

        <aside
          data-education-panel
          className="journey-panel journey-panel--ruled journey-about-education"
        >
          <p className="text-base font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Education
          </p>
          <h3 className="mt-4 text-[clamp(1.8rem,3.6vw,2.6rem)] font-extrabold leading-[1.05] tracking-[-0.03em] text-foreground">
            {education.institution}
          </h3>
          <p className="mt-5 text-lg leading-8 text-muted-foreground">
            {education.degree}
          </p>
          <div className="mt-5 flex flex-wrap items-baseline gap-x-5 gap-y-2 text-base text-muted-foreground">
            <span>{education.dates}</span>
            <span className="font-semibold text-foreground">{education.gpa}</span>
          </div>

          <div className="mt-8 border-t border-border pt-6">
            <p className="text-base font-semibold text-foreground">
              Selected coursework
            </p>
            <ul className="mt-4 grid gap-x-6 gap-y-3 text-base leading-7 text-muted-foreground sm:grid-cols-2">
              {education.coursework.map((course) => (
                <li key={course}>{course}</li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </Station>
  );
}
