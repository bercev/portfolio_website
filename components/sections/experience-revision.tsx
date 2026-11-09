/**
 * Revision-log chrome for experience rows (run-9 RUN9-SECTION-IDENTITIES,
 * third slice: Experience).
 *
 * Experience stops being a bare date-outboard ledger and becomes the
 * engineering drawing's revision table on the drafting table (iter 2's
 * blueprint background): each role is a revision entry — a REV letter, its
 * date range, and a short accent rule that draws in on first scroll into
 * view. The letter press is the 60fps-style press detail; the rule draw
 * is the pen detail, kept distinct from the projects' frame trace (iter 3)
 * and the publications' venue stamp (iter 4).
 *
 * Letter convention: REV A is the FIRST revision on a real drawing, so the
 * newest entry carries the HIGHEST letter — four entries, newest first,
 * read D, C, B, A down the page. The section footer states "latest first"
 * so the order reads as a deliberate log, not a mistake.
 *
 * Experience rows have no dither reveal (unlike projects/publications), so
 * the press + draw start soon after the row enters view (0.1s + stagger),
 * not after a 0.65s dissolve. Reduced motion: letters + rules render
 * settled from the first frame (native hook — motion's useReducedMotion()
 * is unreliable in this app, run-9 iter 1).
 */
"use client";

import { motion, useInView } from "motion/react";
import { useRef } from "react";

import { usePrefersReducedMotion } from "@/lib/use-prefers-reduced-motion";

/** Revision letters, newest first: index 0 of 4 is "D", index 3 is "A". */
export function revLetter(index: number, total: number) {
  const letters = Math.max(total, 1) - 1 - index;
  return String.fromCharCode(65 + Math.max(letters, 0));
}

/** The REV press + rule draw start just after the row enters view. */
export function revDrawDelay(index: number) {
  return 0.1 + index * 0.03;
}

/** Reel-4 rule 1: entrances ease out. */
const SITE_EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];
const PRESS_DURATION = 0.22;
const RULE_DURATION = 0.5;

export function RevisionMark({
  index,
  total,
}: {
  readonly index: number;
  readonly total: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.6 });
  const reduceMotion = usePrefersReducedMotion();
  const delay = revDrawDelay(index);
  const pressed = inView && !reduceMotion;

  return (
    <div ref={ref} className="journey-xp-rev-mark">
      <span className="journey-xp-rev-tag" aria-hidden="true">
        REV
      </span>
      {/* The press target must be keyed to the DRAW, not to mount: an
          opacity target of 1 in the pre-press branch would animate to
          settled while the row is still below the fold, and the letter
          would already be pressed when it scrolls in (same class of bug
          as the iter-3 pen trace and the iter-4 venue stamp). Under
          reduced motion the letter renders settled from the first frame. */}
      <motion.span
        aria-hidden="true"
        className="journey-xp-rev-letter"
        initial={{
          opacity: reduceMotion ? 1 : 0,
          scale: reduceMotion ? 1 : 1.25,
        }}
        animate={
          pressed || reduceMotion
            ? { opacity: 1, scale: 1 }
            : { opacity: 0, scale: 1.25 }
        }
        transition={
          reduceMotion
            ? { duration: 0 }
            : { duration: PRESS_DURATION, delay, ease: SITE_EASE }
        }
      >
        {revLetter(index, total)}
      </motion.span>
      <motion.span
        aria-hidden="true"
        className="journey-xp-rev-rule"
        initial={{ scaleX: reduceMotion ? 1 : 0 }}
        animate={{ scaleX: pressed || reduceMotion ? 1 : 0 }}
        transition={
          reduceMotion
            ? { duration: 0 }
            : {
                duration: RULE_DURATION,
                delay: delay + 0.12,
                ease: SITE_EASE,
              }
        }
      />
    </div>
  );
}
