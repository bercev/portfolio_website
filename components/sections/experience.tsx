"use client";

import { Fragment, type MouseEvent } from "react";

import type { PortfolioContent } from "@/data/content";

import { roleAnchorId } from "@/lib/role-anchor";
import { Station } from "@/components/ui/station";
import { TechPills } from "@/components/ui/tech-pills";
import {
  dispatchSkillHighlight,
  resolveSkillParam,
  techKeyList,
} from "@/lib/skill-work";

type ExperienceProps = {
  readonly content: PortfolioContent["experience"];
  readonly heading: PortfolioContent["navigation"][number]["label"];
  /** Ledger skill names, for the reverse-navigation pill links. */
  readonly skillNames: readonly string[];
};

/**
 * Renders inline `**insight**` markers in experience summaries as bolded
 * key-insights (outcomes/metrics), so the 30-second scan lands. Plain text
 * between markers renders untouched.
 */
function renderSummary(summary: string) {
  return summary.split(/\*\*(.+?)\*\*/g).map((part, index) =>
    index % 2 === 1 ? (
      <strong key={index} className="journey-xp-insight">
        {part}
      </strong>
    ) : (
      <Fragment key={index}>{part}</Fragment>
    ),
  );
}

export function Experience({ content, heading, skillNames }: ExperienceProps) {
  // Experience-row reverse navigation (run-3 iter 25, mirroring the
  // project-row path from iter 23): unlike case-study rows, experience
  // rows are plain articles, not toggle buttons, so the click is
  // delegated on the article itself — a click landing on a pill that
  // resolves to a ledger skill dispatches the highlight event and lands
  // the visitor on the ledger; every other click does nothing. The
  // featured row is a marquee, so its pills stay static labels by the
  // iter-23 rule (a moving click target is worse than none). Keyboard
  // parity note (same as iter 23): pills are not separately focusable,
  // so the ledger's own skill buttons remain the keyboard path; the
  // ledger itself is reachable via rail, FAB, and #skills.
  const handleRowClick = (event: MouseEvent<HTMLElement>) => {
    const target = event.target as HTMLElement | null;
    const key = target?.closest?.("[data-tech]")?.getAttribute("data-tech");
    if (
      key !== null &&
      key !== undefined &&
      resolveSkillParam(key, skillNames) !== null
    ) {
      dispatchSkillHighlight(key);
    }
  };
  return (
    <Station
      id="experience"
      heading={heading}
      className="journey-station--systems"
    >
      <div className="journey-rail-list journey-ledger">
        {content.map((experience, index) => (
          <article
            key={`${experience.role}-${experience.dates}`}
            id={roleAnchorId(experience.role)}
            data-experience-row
            data-work-tech={techKeyList(experience.technologies)}
            data-experience-featured={index === 0 ? "true" : undefined}
            className={
              index === 0
                ? "journey-xp-item journey-xp-item--featured scroll-mt-[calc(4rem+env(safe-area-inset-top))]"
                : "journey-xp-item scroll-mt-[calc(4rem+env(safe-area-inset-top))]"
            }
            onClick={index === 0 ? undefined : handleRowClick}
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
                {renderSummary(experience.summary)}
              </p>
            </div>
            <div className="journey-xp-stack">
              <TechPills
                technologies={experience.technologies}
                marquee={index === 0}
                linkedNames={index === 0 ? undefined : skillNames}
              />
            </div>
          </article>
        ))}
      </div>
    </Station>
  );
}
