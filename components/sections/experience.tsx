"use client";

import { Fragment, useEffect, useRef, useState, type MouseEvent } from "react";
import { useInView } from "motion/react";

import type { PortfolioContent } from "@/data/content";

import { roleAnchorId } from "@/lib/role-anchor";
import { Station } from "@/components/ui/station";
import { TechPills } from "@/components/ui/tech-pills";
import { RevisionMark } from "@/components/sections/experience-revision";
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
  // Measuring-tape entry (run-9 iter 23, RUN9-EXP-TAPE): latched once the
  // featured row first enters view, so the tape's sculpt-pop plays once
  // when the reader reaches the experience section (same latch pattern
  // as the skill tape, iter 21).
  const featuredRef = useRef<HTMLElement | null>(null);
  const featuredInView = useInView(featuredRef, { once: true, amount: 0.3 });
  const [tapeEntered, setTapeEntered] = useState(false);
  useEffect(() => {
    if (featuredInView) setTapeEntered(true);
  }, [featuredInView]);
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
      note="Latest first"
      className="journey-station--systems"
    >
      {/* Revision-table header strip — the ledger's column labels, aligned
          to the rows' subgrid columns (REV / role / stack). Aria-hidden
          chrome: the rows themselves carry the real content. */}
      <div className="journey-rail-list journey-ledger">
        <div
          className="journey-xp-loghead"
          aria-hidden="true"
        >
          <span className="journey-xp-loghead-rev">REV</span>
          <span className="journey-xp-loghead-role">ROLE — DESCRIPTION</span>
          <span className="journey-xp-loghead-stack">STACK</span>
        </div>
        {content.map((experience, index) => (
          <article
            key={`${experience.role}-${experience.dates}`}
            id={roleAnchorId(experience.role)}
            data-experience-row
            data-work-tech={techKeyList(experience.technologies)}
            data-experience-featured={index === 0 ? "true" : undefined}
            ref={index === 0 ? featuredRef : undefined}
            className={
              index === 0
                ? "journey-xp-item journey-xp-item--featured scroll-mt-[calc(4rem+env(safe-area-inset-top))]"
                : "journey-xp-item scroll-mt-[calc(4rem+env(safe-area-inset-top))]"
            }
            onClick={index === 0 ? undefined : handleRowClick}
          >
            {/* Revision mark replaces the bare date outboard: the REV
                letter (newest = highest letter, see experience-revision)
                presses in, a short accent rule draws under it, and the
                date range sits below — one scannable revision entry. */}
            <div className="journey-xp-rev">
              <RevisionMark index={index} total={content.length} />
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
                tape={index === 0}
                tapeEntered={index === 0 ? tapeEntered : undefined}
              />
            </div>
          </article>
        ))}
      </div>
      {/* Revision-table footer: entry count + order, in the drawing's
          title-block voice. */}
      <p className="journey-xp-logfoot">
        {content.length} REVISIONS · LATEST FIRST · DRAWN BY BERAT
      </p>
    </Station>
  );
}
