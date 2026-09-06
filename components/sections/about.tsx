import type { PortfolioContent } from "@/data/content";

import { Station } from "@/components/ui/station";

type AboutProps = {
  readonly content: PortfolioContent["about"];
  readonly heading: PortfolioContent["navigation"][number]["label"];
};

export function About({ content, heading }: AboutProps) {
  const { education } = content;

  return (
    <Station
      id="about"
      station={2}
      heading={heading}
      className="journey-station--origin"
    >
      <div className="journey-col-main journey-about-column">
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
      </div>

      <aside
        data-education-panel
        className="journey-col-rail journey-spec"
        aria-label="Education"
      >
        <p className="journey-spec-label">Education</p>
        <dl className="journey-spec-list">
          <div className="journey-spec-row">
            <dt>School</dt>
            <dd>{education.institution}</dd>
          </div>
          <div className="journey-spec-row">
            <dt>Degree</dt>
            <dd>{education.degree}</dd>
          </div>
          <div className="journey-spec-row">
            <dt>GPA</dt>
            <dd className="journey-spec-figure">{education.gpa}</dd>
          </div>
          <div className="journey-spec-row">
            <dt>Term</dt>
            <dd>{education.dates}</dd>
          </div>
        </dl>

        <p className="journey-spec-label journey-spec-label--inset">
          Coursework
        </p>
        <ul className="journey-spec-tags">
          {education.coursework.map((course) => (
            <li key={course}>{course}</li>
          ))}
        </ul>
      </aside>
    </Station>
  );
}
