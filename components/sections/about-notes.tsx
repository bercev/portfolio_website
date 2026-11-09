/**
 * Field-notes chrome for the About section (run-9 RUN9-SECTION-IDENTITIES,
 * fifth slice: About).
 *
 * About stops being bare stacked paragraphs + a bare spec list and becomes
 * the drafting table's field notes + title block (iter 2's blueprint
 * background): each bio paragraph is a numbered field note — a mono numeral
 * in the left margin that presses in and a hairline rule that draws across
 * the top of the note on first scroll into view — and the education rail
 * becomes a bordered title block (Education / School / Degree / GPA / Term /
 * Coursework, footer "SCALE 1:1 · DRAWN BY BERAT · REV A"). The press +
 * draw reuse the experience slice's 220ms / 0.5s language so the five
 * section identities read as one drawing set, not five inventions.
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

import { usePrefersReducedMotion } from "@/lib/use-prefers-reduced-motion";

/** Field-note number, 1-based and zero-padded: "01". */
export function noteLabel(index: number) {
  return `NOTE ${String(index + 1).padStart(2, "0")}`;
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
  children,
}: {
  readonly index: number;
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
        {String(index + 1).padStart(2, "0")}
      </motion.span>
      <div className="journey-about-note-body">
        <span className="sr-only">{noteLabel(index)}: </span>
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
