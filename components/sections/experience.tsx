import type { PortfolioContent } from "@/data/content";

import { Station } from "@/components/ui/station";

type ExperienceProps = {
  readonly content: PortfolioContent["experience"];
  readonly heading: PortfolioContent["navigation"][number]["label"];
};

export function Experience({ content, heading }: ExperienceProps) {
  return (
    <Station id="experience" station={4} kicker="Voyage" heading={heading}>
      <div className="journey-panel">
        {content.map((experience) => (
          <article
            key={`${experience.role}-${experience.dates}`}
            data-experience-row
            className="journey-xp-item"
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
