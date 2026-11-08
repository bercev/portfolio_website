/**
 * Journal-plate chrome for publication rows (run-9 RUN9-SECTION-IDENTITIES,
 * second slice: Publications).
 *
 * Publications stop being bare ledger rows and become printed-journal
 * plates: a double masthead rule, the paper's real first-page preview as a
 * FIG. plate, a serif title, the full author line (Berat in accent), and a
 * venue stamp that presses in on first scroll into view. The stamp is the
 * 60fps-style press detail; the figure makes the research tangible at a
 * glance. Reduced motion: static plates, stamp fully settled (native hook —
 * motion's useReducedMotion() is unreliable in this app, run-9 iter 1).
 */
"use client";

import { motion, useInView } from "motion/react";
import { useRef } from "react";

import { usePrefersReducedMotion } from "@/lib/use-prefers-reduced-motion";

/** Plate labels: "FIG. 01", "PLATE 01 / 02". */
export function plateLabels(index: number, total: number) {
  const n = String(index + 1).padStart(2, "0");
  const t = String(Math.max(total, 1)).padStart(2, "0");
  return { fig: `FIG. ${n}`, plate: `PLATE ${n} / ${t}` };
}

/** The stamp presses in as the dither dissolve finishes (0.65s) + row stagger. */
export function stampDelay(index: number) {
  return 0.7 + index * 0.03;
}

/** Reel-4 rule 1: entrances ease out. */
const SITE_EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];
const STAMP_DURATION = 0.22;

export function VenueStamp({
  venue,
  index,
}: {
  readonly venue: string;
  readonly index: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.6 });
  const reduceMotion = usePrefersReducedMotion();
  const delay = stampDelay(index);
  const pressed = inView && !reduceMotion;

  return (
    <motion.span
      ref={ref}
      aria-hidden="true"
      className="journey-pub-stamp"
      // The press target must be keyed to the DRAW, not to mount: an
      // opacity/scale target of 1 in the pre-press branch would animate to
      // settled while the plate is still below the fold, and the stamp
      // would already be pressed when it scrolls in (same class of bug as
      // the iter-3 pen trace). Under reduced motion the stamp renders
      // settled from the first frame.
      initial={{
        opacity: reduceMotion ? 1 : 0,
        scale: reduceMotion ? 1 : 1.6,
        rotate: -8,
      }}
      animate={
        pressed || reduceMotion
          ? { opacity: 1, scale: 1, rotate: -8 }
          : { opacity: 0, scale: 1.6, rotate: -14 }
      }
      transition={
        reduceMotion
          ? { duration: 0 }
          : { duration: STAMP_DURATION, delay, ease: SITE_EASE }
      }
    >
      {venue}
    </motion.span>
  );
}
