import type { PortfolioContent } from "@/data/content";

import { AboutNote } from "@/components/sections/about-notes";
import { CourseworkList } from "@/components/sections/about-coursework";
import { courseworkCountLabel } from "@/lib/about-coursework";
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
          <span className="journey-about-notes-head-num">
            Notes · {String(content.bio.length).padStart(2, "0")} entries
          </span>
        </p>
        <div className="journey-copy">
          {content.bio.map((paragraph, index) => (
            <AboutNote
              key={paragraph}
              index={index}
              total={content.bio.length}
            >
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
        className="journey-col-rail journey-about-flow"
        aria-label="Education"
      >
        <p className="journey-about-flow-head">
          <span className="journey-about-flow-head-num">Education</span>
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
          Coursework — {courseworkCountLabel(education.coursework.length)}
        </p>
        <CourseworkList courses={education.coursework} />
      </aside>
    </Station>
  );
}
