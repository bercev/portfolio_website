/**
 * Ghost wireframe for the 404's missing figure (run-9 RUN9-404-GHOST-FIGURE).
 *
 * The 404 was the barest surface on the site: a ~250px empty dashed
 * rectangle with only a "+" registration mark. The missing figure is now
 * drawn as a ghost wireframe, in the drafting language the rest of the
 * site speaks: two diagonal hairlines cross the void corner to corner
 * (the drafting convention for a missing figure), dimension lines with
 * end ticks run just inside the top and left edges, and a "NO DRAWING"
 * stamp presses in over the crossing — the verdict, in the same
 * press-and-draw family as the venue stamp and the action plates.
 *
 * No invented figure: the wireframe marks the void itself, so the joke
 * reads as a drawing, not an empty box. The frame stays dashed, the
 * caption ("Fig. — · No drawing on file") stays verbatim, and the
 * stamped action plates + title-block footer are untouched. The whole
 * figure is aria-hidden decoration; screen readers get the caption.
 * Reduced motion renders everything settled from the first frame via
 * the native hook (motion's useReducedMotion() is unreliable in this
 * app, run-9 iter 1) — durations go to 0 under RM.
 */
"use client";

import { motion, useInView } from "motion/react";
import { useRef } from "react";

import { usePrefersReducedMotion } from "@/lib/use-prefers-reduced-motion";

/** The diagonal cross draws across the void (0.9s, same as the pen trace). */
export const NOT_FOUND_GHOST_DRAW_MS = 900;

/** The dimension lines start once the diagonals are underway. */
export const NOT_FOUND_GHOST_DIM_DELAY_S = 0.55;

/** The stamp presses in after the draw, like the venue stamp's 0.7s. */
export const NOT_FOUND_GHOST_STAMP_DELAY_S = 0.7;

/** The stamp presses on the REV-letter / field-note timing (220ms). */
export const NOT_FOUND_GHOST_STAMP_PRESS_MS = 220;

/** Reel-4 rule 1: entrances ease out. */
const SITE_EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

/**
 * Draw delay in seconds for each layer of the ghost figure — the
 * diagonals first, the dimension lines mid-draw, the stamp last.
 */
export function ghostFigureDrawDelay(
  part: "diagonal" | "dimension" | "stamp",
): number {
  if (part === "diagonal") return 0.1;
  if (part === "dimension") return NOT_FOUND_GHOST_DIM_DELAY_S;
  return NOT_FOUND_GHOST_STAMP_DELAY_S;
}

export function NotFoundGhostFigure() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  const reduceMotion = usePrefersReducedMotion();
  const entered = inView || reduceMotion;
  const drawMs = reduceMotion ? 0 : NOT_FOUND_GHOST_DRAW_MS;
  const pressMs = reduceMotion ? 0 : NOT_FOUND_GHOST_STAMP_PRESS_MS;

  return (
    <div ref={ref} className="not-found-ghost" aria-hidden="true">
      <svg
        className="not-found-ghost-svg"
        viewBox="0 0 640 280"
        preserveAspectRatio="none"
        focusable="false"
      >
        {/* Diagonal cross — the void, drawn corner to corner. */}
        <motion.line
          className="not-found-ghost-diagonal"
          x1="0"
          y1="0"
          x2="640"
          y2="280"
          pathLength={1}
          initial={{ pathLength: 0 }}
          animate={entered ? { pathLength: 1 } : {}}
          transition={{
            duration: drawMs / 1000,
            delay: ghostFigureDrawDelay("diagonal"),
            ease: SITE_EASE,
          }}
        />
        <motion.line
          className="not-found-ghost-diagonal"
          x1="640"
          y1="0"
          x2="0"
          y2="280"
          pathLength={1}
          initial={{ pathLength: 0 }}
          animate={entered ? { pathLength: 1 } : {}}
          transition={{
            duration: drawMs / 1000,
            delay: ghostFigureDrawDelay("diagonal"),
            ease: SITE_EASE,
          }}
        />
        {/* Top dimension line with end ticks. */}
        <motion.g
          initial={{ opacity: 0 }}
          animate={entered ? { opacity: 1 } : {}}
          transition={{
            duration: 0.4,
            delay: ghostFigureDrawDelay("dimension"),
            ease: SITE_EASE,
          }}
        >
          <line x1="40" y1="18" x2="600" y2="18" />
          <line x1="40" y1="12" x2="40" y2="24" />
          <line x1="600" y1="12" x2="600" y2="24" />
        </motion.g>
        {/* Left dimension line with end ticks. */}
        <motion.g
          initial={{ opacity: 0 }}
          animate={entered ? { opacity: 1 } : {}}
          transition={{
            duration: 0.4,
            delay: ghostFigureDrawDelay("dimension"),
            ease: SITE_EASE,
          }}
        >
          <line x1="18" y1="40" x2="18" y2="240" />
          <line x1="12" y1="40" x2="24" y2="40" />
          <line x1="12" y1="240" x2="24" y2="240" />
        </motion.g>
      </svg>
      <motion.span
        className="not-found-ghost-stamp"
        initial={{ scale: 1.6, opacity: 0, rotate: -14 }}
        animate={entered ? { scale: 1, opacity: 1, rotate: -8 } : {}}
        transition={{
          duration: pressMs / 1000,
          delay: ghostFigureDrawDelay("stamp"),
          ease: SITE_EASE,
        }}
      >
        No drawing
      </motion.span>
    </div>
  );
}
