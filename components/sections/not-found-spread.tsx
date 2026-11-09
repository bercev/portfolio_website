/**
 * Missing-sheet spread furniture for the 404 (run-9 RUN9-404-SPREAD).
 *
 * The 404 was the sparsest composition on the site: a lone 40rem plate
 * in a large flat dark field, no grid, no rail, no bust. The spread
 * answers it in the drafting language the rest of the site speaks:
 *
 * - An oversized exterior dimension line above the ghost figure — the
 *   missing figure measured in its own native units (the figure's SVG
 *   viewBox is 640 × 280, so the label is real data, not invented copy).
 *   It draws across on first view, in the FigMeasure family.
 * - A torn-sheet bottom edge — the sheet's bottom border is replaced by
 *   a jagged tear line, so the missing sheet ends torn, not ruled.
 *
 * No invented figure, no new copy: the status line, caption, action
 * plates and title block are untouched. The measure is aria-hidden
 * decoration; screen readers get the caption. Reduced motion renders
 * everything settled from the first frame via the native hook (motion's
 * useReducedMotion() is unreliable in this app, run-9 iter 1) — the
 * line's duration goes to 0 under RM.
 */
"use client";

import { motion, useInView } from "motion/react";
import { useRef } from "react";

import { usePrefersReducedMotion } from "@/lib/use-prefers-reduced-motion";

/** The exterior dimension line draws across the figure (0.6s, FigMeasure family). */
export const SPREAD_MEASURE_DRAW_MS = 600;

/** The dimension line starts once the ghost diagonals are underway. */
export const SPREAD_MEASURE_DELAY_S = 0.4;

/** The label + end ticks fade in just after the line starts. */
export const SPREAD_MEASURE_LABEL_DELAY_S = 0.55;

/** Reel-4 rule 1: entrances ease out. */
const SITE_EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

/**
 * The exterior dimension measures the ghost figure in its own native
 * units — the figure's SVG viewBox is 640 × 280 (not-found-figure.tsx),
 * so the label is real data, not invented copy.
 */
export function spreadMeasureLabel(): string {
  return "640 × 280";
}

/** Draw delay in seconds for each layer of the spread measure. */
export function spreadMeasureDrawDelay(part: "line" | "label"): number {
  if (part === "line") return SPREAD_MEASURE_DELAY_S;
  return SPREAD_MEASURE_LABEL_DELAY_S;
}

/**
 * Torn-sheet edge points: a polyline across the 1000-wide viewBox,
 * teeth alternating 2/8px around the midline, starting and ending at
 * the bottom corners (y 10) so the tear meets the sheet's side borders
 * cleanly instead of floating 5px above them.
 */
export function notFoundTearPoints(): string {
  const points: string[] = ["0,10"];
  for (let x = 25; x < 1000; x += 25) {
    points.push(`${x},${x % 50 === 25 ? 2 : 8}`);
  }
  points.push("1000,10");
  return points.join(" ");
}

export function NotFoundSpreadMeasure() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  const reduceMotion = usePrefersReducedMotion();
  const entered = inView || reduceMotion;
  const drawMs = reduceMotion ? 0 : SPREAD_MEASURE_DRAW_MS;

  return (
    <div ref={ref} className="not-found-measure" aria-hidden="true">
      <motion.span
        className="not-found-measure-label"
        initial={{ opacity: 0 }}
        animate={entered ? { opacity: 1 } : {}}
        transition={{
          duration: 0.4,
          delay: spreadMeasureDrawDelay("label"),
          ease: SITE_EASE,
        }}
      >
        {spreadMeasureLabel()}
      </motion.span>
      <svg
        className="not-found-measure-svg"
        viewBox="0 0 1000 30"
        preserveAspectRatio="none"
        focusable="false"
      >
        <motion.line
          x1="0"
          y1="24"
          x2="1000"
          y2="24"
          pathLength={1}
          initial={{ pathLength: 0 }}
          animate={entered ? { pathLength: 1 } : {}}
          transition={{
            duration: drawMs / 1000,
            delay: spreadMeasureDrawDelay("line"),
            ease: SITE_EASE,
          }}
        />
        <motion.g
          initial={{ opacity: 0 }}
          animate={entered ? { opacity: 1 } : {}}
          transition={{
            duration: 0.4,
            delay: spreadMeasureDrawDelay("label"),
            ease: SITE_EASE,
          }}
        >
          <line x1="0" y1="16" x2="0" y2="30" />
          <line x1="1000" y1="16" x2="1000" y2="30" />
        </motion.g>
      </svg>
    </div>
  );
}

export function NotFoundTearEdge() {
  return (
    <div className="not-found-tear" aria-hidden="true">
      <svg viewBox="0 0 1000 10" preserveAspectRatio="none" focusable="false">
        <polyline points={notFoundTearPoints()} />
      </svg>
    </div>
  );
}
