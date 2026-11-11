/**
 * Drawing detail callouts for the expanded case-study panels (run-9
 * RUN9-CASE-DETAIL).
 *
 * The panel interior was the last untransformed block on the home page:
 * behind the transformed "OPEN THE DRAWING" fold tab sat plain bold
 * mini-headings + muted paragraphs — the old site, the moment a panel
 * opened. Each present subsection is now a numbered DETAIL plate in the
 * drawing set's language: a mono accent numeral that presses in and a
 * hairline rule that draws under the head on open (the About field-notes
 * / experience flow marks 220ms / 0.5s language, 45ms stagger per
 * plate), the Snapshot restyled as a title-block spec table, and the
 * metrics as a measured-values strip. Copy is verbatim; the height-expand
 * mechanism, aria state, and print branch are untouched.
 *
 * The plates mount when the panel opens, so the press + draw are keyed to
 * mount (not to scroll into view — the lower plates settle unseen below
 * the fold, which is fine: the reader scrolls to settled plates). Reduced
 * motion renders everything settled from the first frame via the native
 * hook (motion's useReducedMotion() is unreliable in this app, run-9
 * iter 1); the animate targets are the settled values in both branches,
 * so no hydration race can leave a plate hidden.
 */
"use client";

import { motion } from "motion/react";
import type { ReactNode } from "react";

import { usePrefersReducedMotion } from "@/lib/use-prefers-reduced-motion";
import type { ProjectCaseStudy } from "@/data/content";

export type CaseDetailKind =
  | "prose"
  | "architecture"
  | "outcome"
  | "snapshot"
  | "links";

export type CaseDetail = {
  readonly key: string;
  readonly label: string;
  readonly kind: CaseDetailKind;
  /** Prose body for the prose / outcome kinds. */
  readonly text?: string;
};

/** Detail number, 1-based and zero-padded: "DETAIL 01". */
export function detailLabel(index: number) {
  return `DETAIL ${String(index + 1).padStart(2, "0")}`;
}

/** Press + rule-draw stagger across the plates on panel open. */
export function caseDetailDelay(index: number) {
  return index * 0.045;
}

/**
 * The ordered detail plates for a case study, in render order, skipping
 * sections the project doesn't have. The numbering is computed here so
 * both projects stay dense (Vitae's Architecture plate shifts its later
 * plates by one; the chatbot's list closes up without it) and the order
 * is pinned by test instead of by JSX accident.
 */
export function caseStudyDetails(
  caseStudy: ProjectCaseStudy,
  hasDiagram: boolean,
  hasLinks: boolean,
): CaseDetail[] {
  const details: CaseDetail[] = [
    { key: "problem", label: "Problem", kind: "prose", text: caseStudy.problem },
    { key: "decision", label: "Key decision", kind: "prose", text: caseStudy.decision },
  ];
  if (hasDiagram) {
    details.push({ key: "architecture", label: "Architecture", kind: "architecture" });
  }
  if (caseStudy.rejected) {
    details.push({ key: "rejected", label: "Not shipped", kind: "prose", text: caseStudy.rejected });
  }
  details.push({ key: "outcome", label: "Outcome", kind: "outcome", text: caseStudy.outcome });
  if (caseStudy.evaluation) {
    details.push({ key: "evaluation", label: "Evaluation", kind: "prose", text: caseStudy.evaluation });
  }
  if (caseStudy.role || caseStudy.team || caseStudy.timeline) {
    details.push({ key: "snapshot", label: "Snapshot", kind: "snapshot" });
  }
  if (caseStudy.didntWork) {
    details.push({ key: "didnt-work", label: "What didn't work", kind: "prose", text: caseStudy.didntWork });
  }
  if (caseStudy.differently) {
    details.push({ key: "differently", label: "What I'd do differently", kind: "prose", text: caseStudy.differently });
  }
  if (caseStudy.tradeoffs) {
    details.push({ key: "tradeoffs", label: "Trade-offs", kind: "prose", text: caseStudy.tradeoffs });
  }
  if (hasLinks) {
    details.push({ key: "links", label: "Links", kind: "links" });
  }
  return details;
}

/** Reel-4 rule 1: entrances ease out. */
const SITE_EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];
const PRESS_DURATION = 0.22;
const RULE_DURATION = 0.5;

export function CaseDetailPlate({
  index,
  label,
  children,
}: {
  readonly index: number;
  readonly label: string;
  readonly children: ReactNode;
}) {
  const reduceMotion = usePrefersReducedMotion();
  const delay = caseDetailDelay(index);

  return (
    <div className="journey-case-detail" data-case-detail>
      <div className="journey-case-detail-head">
        <motion.span
          aria-hidden="true"
          className="journey-case-detail-num"
          initial={{ opacity: reduceMotion ? 1 : 0, scale: reduceMotion ? 1 : 1.25 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={
            reduceMotion
              ? { duration: 0 }
              : { duration: PRESS_DURATION, delay, ease: SITE_EASE }
          }
        >
          {detailLabel(index)}
        </motion.span>
        <span className="journey-case-detail-title">{label}</span>
      </div>
      <motion.span
        aria-hidden="true"
        className="journey-case-detail-rule"
        initial={{ scaleX: reduceMotion ? 1 : 0 }}
        animate={{ scaleX: 1 }}
        transition={
          reduceMotion
            ? { duration: 0 }
            : { duration: RULE_DURATION, delay, ease: SITE_EASE }
        }
      />
      <div className="journey-case-detail-body">{children}</div>
    </div>
  );
}
