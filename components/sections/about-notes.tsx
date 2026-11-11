/**
 * Light/flow chrome for the About section (run-9 RUN9-SECTION-IDENTITIES,
 * fifth slice: About; re-skinned to light/flow in run-10 RUN10-ABOUT).
 *
 * Run 9 made About the drafting table's field notes + title block: each
 * bio paragraph a numbered field note — a mono numeral in the left margin
 * that presses in and a hairline rule that draws across the top of the
 * note on first scroll into view — and the education rail a bordered
 * title block. Run 10 keeps the motion contract (220ms press / 0.5s rule
 * draw, 0.1s + stagger) and changes only the language: the numerals are
 * the shared flow labels ("01 / 04", lib/plate-labels.ts) with a glow
 * dot, and the rule is a fading light line, not a hairline — the same
 * language as the experience flow marks, so the section reads as light,
 * not paper.
 *
 * The bio paragraphs have no dither reveal (unlike projects/publications),
 * so the press + draw start soon after the note enters view (0.1s +
 * stagger), not after a 0.65s dissolve. Reduced motion: numerals + rules
 * render settled from the first frame (native hook — motion's
 * useReducedMotion() is unreliable in this app, run-9 iter 1).
 */
"use client";

import { motion, useInView } from "motion/react";
import type { ReactNode } from "react";
import { useRef } from "react";

import { flowLabels } from "@/lib/plate-labels";
import { usePrefersReducedMotion } from "@/lib/use-prefers-reduced-motion";

/** Screen-reader note label: "Note 1 of 4". */
export function noteLabel(index: number, total: number) {
  return `Note ${index + 1} of ${Math.max(total, 1)}`;
}

/** The note press + rule draw start just after the note enters view. */
export function noteDrawDelay(index: number) {
  return 0.1 + index * 0.03;
}

/** Reel-4 rule 1: entrances ease out. */
const SITE_EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];
const PRESS_DURATION = 0.22;
const RULE_DURATION = 0.5;

export function AboutNote({
  index,
  total,
  children,
}: {
  readonly index: number;
  readonly total: number;
  readonly children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  const reduceMotion = usePrefersReducedMotion();
  const delay = noteDrawDelay(index);
  const pressed = inView && !reduceMotion;

  return (
    <div ref={ref} data-about-note className="journey-about-note">
      <motion.span
        aria-hidden="true"
        className="journey-about-note-num"
        // Key the press to the DRAW, not to mount: an opacity target of 1
        // in the pre-press branch would animate to settled while the note
        // is still below the fold (same class of bug as the iter-3 pen
        // trace and the iter-4 venue stamp). Under reduced motion the
        // numeral renders settled from the first frame.
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
        <span aria-hidden="true" className="journey-about-note-dot" />
        {flowLabels(index, total).plate}
      </motion.span>
      <div className="journey-about-note-body">
        <span className="sr-only">{noteLabel(index, total)}: </span>
        <motion.span
          aria-hidden="true"
          className="journey-about-note-rule"
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
        {children}
      </div>
    </div>
  );
}
