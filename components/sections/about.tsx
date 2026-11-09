import type { PortfolioContent } from "@/data/content";

import { AboutNote } from "@/components/sections/about-notes";
import { LedeReveal } from "@/components/sections/lede-reveal";
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
      heading={heading}
      className="journey-station--origin"
    >
      <div className="journey-col-main journey-about-column">
        <p className="journey-about-notes-head">
          Field notes — {content.bio.length} entries
        </p>
        <div className="journey-copy">
          {content.bio.map((paragraph, index) => (
            <AboutNote key={paragraph} index={index}>
              {index === 0 ? (
                <LedeReveal text={paragraph} />
              ) : (
                <p className="journey-body">{paragraph}</p>
              )}
            </AboutNote>
          ))}
        </div>
      </div>

      <aside
        data-education-panel
        className="journey-col-rail journey-spec journey-about-titleblock"
        aria-label="Education"
      >
        <p className="journey-about-titleblock-head">
          <span className="journey-spec-label">Education</span>
          <span aria-hidden="true" className="journey-about-titleblock-mark">
            +
          </span>
        </p>
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

        <p className="journey-about-titleblock-foot">
          Scale 1:1 · Drawn by Berat · Rev A
        </p>
      </aside>
    </Station>
  );
}
