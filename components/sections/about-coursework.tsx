/**
 * Coursework as a drafted parts list (run-9 RUN9-ABOUT-COURSEWORK,
 * iter 30).
 *
 * The audit (iter 30) ranked the Coursework list the biggest plain-content
 * pocket left on the site: seven course names as bare muted wrapped text
 * inside an otherwise drafted Education title block — no numbers, no
 * rules, no draw. Each course becomes a numbered part — a mono accent
 * numeral (CW-01..CW-07) that presses in and a hairline rule that draws
 * across the row on first scroll into view, 45ms stagger — the same
 * 220ms press / 0.5s rule-draw language as the field notes, the
 * experience revision marks, the Elsewhere rows, and the paper action
 * plates, so the title block reads as one drawing set. The label carries
 * the computed part count ("Coursework — 07 parts"). Reduced motion:
 * numerals + rules render settled from the first frame (native hook —
 * motion's useReducedMotion() is unreliable in this app, run-9 iter 1).
 *
 * Copy is verbatim from content.ts; the list keeps its <ul> semantics.
 */
"use client";

import { motion, useInView } from "motion/react";
import { useRef } from "react";

import {
  courseworkDrawDelay,
  courseworkPartLabel,
} from "@/lib/about-coursework";
import { usePrefersReducedMotion } from "@/lib/use-prefers-reduced-motion";

// Re-exported for the component's own importers (same pattern as
// lib/plate-labels.ts): the pure helpers live in the server-safe module.
export {
  courseworkCountLabel,
  courseworkDrawDelay,
  courseworkPartLabel,
} from "@/lib/about-coursework";

/** Reel-4 rule 1: entrances ease out. */
const SITE_EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];
const PRESS_DURATION = 0.22;
const RULE_DURATION = 0.5;

export function CourseworkList({
  courses,
}: {
  readonly courses: readonly string[];
}) {
  const ref = useRef<HTMLUListElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  const reduceMotion = usePrefersReducedMotion();

  return (
    <ul ref={ref} className="journey-coursework-list">
      {courses.map((course, index) => {
        const delay = courseworkDrawDelay(index);
        const pressed = inView && !reduceMotion;
        return (
          <li key={course} className="journey-coursework-row">
            <motion.span
              aria-hidden="true"
              className="journey-coursework-num"
              // Key the press to the DRAW, not to mount: an opacity target
              // of 1 in the pre-press branch would animate to settled
              // while the list is still below the fold (same class of bug
              // as the iter-3 pen trace and the iter-4 venue stamp).
              // Under reduced motion the numeral renders settled from the
              // first frame.
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
              {courseworkPartLabel(index)}
            </motion.span>
            <span className="journey-coursework-name">{course}</span>
            <motion.span
              aria-hidden="true"
              className="journey-coursework-rule"
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
          </li>
        );
      })}
    </ul>
  );
}
