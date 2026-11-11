/**
 * Light/flow chrome for publication rows (run-10 RUN10-PUBLICATIONS).
 *
 * Publications stop being printed-journal plates and become rows of
 * light: a single beam of light across the top of each row, the paper's
 * real first-page preview lit with a faint accent edge instead of a
 * foreground plate border, a quiet glow-dot caption ("First page ·
 * 817 × 867"), a glow-dot flow number ("01 / 02") in place of the
 * "PLATE 01 / 02" kicker, and the venue as a luminous glow line that
 * fades in on first scroll into view — no rotated stamp pressing in,
 * no double masthead rule, no FIG. caption. Reduced motion: static
 * rows, venue glow fully settled (native hook — motion's
 * useReducedMotion() is unreliable in this app, run-9 iter 1).
 */
"use client";

import { motion, useInView } from "motion/react";
import { useRef } from "react";

import { flowLabels } from "@/lib/plate-labels";
import { usePrefersReducedMotion } from "@/lib/use-prefers-reduced-motion";

export { flowLabels };

/** The glow fades in as the dither dissolve finishes (0.65s) + row stagger. */
export function glowDelay(index: number) {
  return 0.7 + index * 0.03;
}

/** Reel-4 rule 1: entrances ease out. */
const SITE_EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];
const GLOW_DURATION = 0.22;

export function VenueGlow({
  venue,
  index,
}: {
  readonly venue: string;
  readonly index: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.6 });
  const reduceMotion = usePrefersReducedMotion();
  const delay = glowDelay(index);
  const settled = inView && !reduceMotion;

  return (
    <motion.span
      ref={ref}
      aria-hidden="true"
      className="journey-pub-venue-glow"
      // The fade target must be keyed to the DRAW, not to mount: an
      // opacity target of 1 in the pre-glow branch would animate to
      // settled while the row is still below the fold, and the venue
      // would already be lit when it scrolls in (same class of bug as
      // the run-9 stamp's press target). Under reduced motion the glow
      // renders settled from the first frame.
      initial={{ opacity: reduceMotion ? 1 : 0 }}
      animate={settled || reduceMotion ? { opacity: 1 } : { opacity: 0 }}
      transition={
        reduceMotion
          ? { duration: 0 }
          : { duration: GLOW_DURATION, delay, ease: SITE_EASE }
      }
    >
      {venue}
    </motion.span>
  );
}
