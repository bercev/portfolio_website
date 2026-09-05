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
      heading={heading}
      note={`${content.length} roles · 2024 — present`}
      className="journey-station--systems"
    >
      <div className="journey-rail-list journey-ledger">
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
            <div className="journey-xp-outboard">
              <span className="journey-xp-when">{experience.dates}</span>
            </div>
            <div className="journey-xp-main">
              {experience.organization ? (
                <p className="journey-xp-org">{experience.organization}</p>
              ) : null}
              <h3 className="journey-xp-title">{experience.role}</h3>
              <p className="journey-body journey-xp-summary">
                {experience.summary}
              </p>
            </div>
            <div className="journey-xp-stack">
              <ul className="journey-xp-tools" aria-label="Stack">
                {experience.technologies.map((technology) => (
                  <li key={technology}>{technology}</li>
                ))}
              </ul>
            </div>
          </article>
        ))}
      </div>
    </Station>
  );
}
