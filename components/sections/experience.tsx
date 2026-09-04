import type { PortfolioContent } from "@/data/content";

import { Station } from "@/components/ui/station";

type ExperienceProps = {
  readonly content: PortfolioContent["experience"];
  readonly heading: PortfolioContent["navigation"][number]["label"];
};

export function Experience({ content, heading }: ExperienceProps) {
  return (
    <Station
      id="experience"
      station={4}
      kicker="Systems"
      beat="Multi-agent systems in production"
      heading={heading}
      className="journey-station--systems"
    >
      <div className="journey-rail-list">
        {content.map((experience, index) => (
          <article
            key={`${experience.role}-${experience.dates}`}
            data-experience-row
            data-experience-featured={index === 0 ? "true" : undefined}
            className={
              index === 0
                ? "journey-xp-item journey-xp-item--featured"
                : "journey-xp-item"
            }
          >
            <span className="journey-xp-when">{experience.dates}</span>
            <div>
              {experience.organization ? (
                <p className="mt-1 text-base text-muted-foreground">
                  {experience.organization}
                </p>
              ) : null}
              <h3 className="text-2xl font-bold leading-[0.95] tracking-[-0.03em] text-foreground sm:text-3xl">
                {experience.role}
              </h3>
              {index === 0 ? (
                <span className="journey-tag">In production</span>
              ) : null}
              <p className="mt-4 max-w-[72ch] text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">
                {experience.summary}
              </p>
              <p className="mt-4 text-base leading-7 text-muted-foreground">
                <span className="font-semibold text-foreground">Tools: </span>
                {experience.technologies.join(", ")}
              </p>
            </div>
          </article>
        ))}
      </div>
    </Station>
  );
}
