/**
 * Light frame for project rows (run-10 RUN10-PROJECTS).
 *
 * The Projects section stops being a stack of drafting sheets and becomes
 * a field of light: each row carries a light beam along its top edge that
 * sweeps in from the left on first scroll into view, then settles as a
 * soft resting glow, plus two glow dots at the top corners. No border,
 * no inner margin frame, no pen trace, no registration marks, no FIG./
 * SHEET/PLATE chrome — the row's own content (headline, preview, pills)
 * does the work, the light just frames it.
 *
 * Sequencing: the row's dither dissolve runs 0.65s, so the sweep starts
 * at 0.7s + the row stagger. Reduced motion: the beam and dots render
 * statically at their resting state (native hook — motion's
 * useReducedMotion() is unreliable in this app, run-9 iter 1).
 */
"use client";

import { motion, useInView } from "motion/react";
import { useRef } from "react";

import { usePrefersReducedMotion } from "@/lib/use-prefers-reduced-motion";

/** Row number labels: "01", "01 / 02". */
export function flowLabels(index: number, total: number) {
  const n = String(index + 1).padStart(2, "0");
  const t = String(Math.max(total, 1)).padStart(2, "0");
  return { num: n, count: `${n} / ${t}` };
}

/** The sweep starts as the dither dissolve finishes (0.65s) + row stagger. */
export function lightSweepDelay(index: number) {
  return 0.7 + index * 0.03;
}

/** Reel-4 rule 1: entrances ease out. */
const SITE_EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];
const SWEEP_DURATION = 0.9;
const SWEEP_FADE = 0.4;
/** The beam's resting glow once the sweep has settled. */
const BEAM_REST_OPACITY = 0.55;

export function ProjectLightFrame({ index }: { readonly index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.3 });
  const reduceMotion = usePrefersReducedMotion();
  const delay = lightSweepDelay(index);
  const draw = inView && !reduceMotion;

  return (
    <div ref={ref} aria-hidden="true" className="journey-project-lightframe">
      {/* The light beam: sweeps across the row's top edge, then settles to
          its resting glow. The fade lives on opacity, keyed to the DRAW:
          an opacity target of 0 in the pre-draw branch would animate to 0
          while the row is still below the fold, and the beam would be
          invisible when it finally sweeps (same keying lesson as the old
          pen trace). Under reduced motion the beam renders statically at
          its resting glow from the first frame. */}
      <motion.div
        aria-hidden="true"
        className="journey-project-lightbeam"
        initial={
          reduceMotion
            ? { scaleX: 1, opacity: BEAM_REST_OPACITY }
            : { scaleX: 0, opacity: 0 }
        }
        animate={
          reduceMotion
            ? { scaleX: 1, opacity: BEAM_REST_OPACITY }
            : draw
              ? { scaleX: 1, opacity: [0, 1, 1, BEAM_REST_OPACITY] }
              : { scaleX: 0, opacity: 0 }
        }
        transition={{
          scaleX: { duration: SWEEP_DURATION, delay, ease: SITE_EASE },
          opacity: {
            duration: SWEEP_DURATION + SWEEP_FADE,
            delay,
            times: [
              0,
              0.05,
              SWEEP_DURATION / (SWEEP_DURATION + SWEEP_FADE),
              1,
            ],
            ease: "easeOut",
          },
        }}
      />
      {/* Glow dots, printed on the row's top corners — static light, they
          fade in with the sweep and stay. */}
      <motion.span
        aria-hidden="true"
        className="journey-project-glowdot journey-project-glowdot--left"
        initial={{ opacity: reduceMotion ? 1 : 0 }}
        animate={{ opacity: draw || reduceMotion ? 1 : 0 }}
        transition={
          reduceMotion ? { duration: 0 } : { duration: 0.4, delay: delay + 0.3 }
        }
      />
      <motion.span
        aria-hidden="true"
        className="journey-project-glowdot journey-project-glowdot--right"
        initial={{ opacity: reduceMotion ? 1 : 0 }}
        animate={{ opacity: draw || reduceMotion ? 1 : 0 }}
        transition={
          reduceMotion ? { duration: 0 } : { duration: 0.4, delay: delay + 0.3 }
        }
      />
    </div>
  );
}
