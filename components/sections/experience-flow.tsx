/**
 * Light/flow mark for experience rows (run-10 RUN10-EXPERIENCE): the
 * run-9 revision table is de-drafted — no REV letters, no "REV" tag, no
 * title-block voice. Each role is now a point of light on the timeline:
 * a glow dot + its flow number ("01 / 04", shared flowLabels) that
 * presses in, and a short light rule that draws under it on first scroll
 * into view.
 *
 * The motion contract is unchanged from the revision mark it replaces
 * (220ms press, 0.5s rule draw, 0.1s + 30ms stagger per row, ease-out
 * entrances per reel 4) — only the language changed. The press + draw
 * start soon after the row enters view (0.1s + stagger), not after a
 * 0.65s dissolve, because experience rows have no dither reveal.
 * Reduced motion: number + rule render settled from the first frame
 * (native hook — motion's useReducedMotion() is unreliable in this app,
 * run-9 iter 1).
 */
"use client";

import { motion, useInView } from "motion/react";
import { useRef } from "react";

import { flowLabels } from "@/lib/plate-labels";
import { usePrefersReducedMotion } from "@/lib/use-prefers-reduced-motion";

/** The flow-number press + rule draw start just after the row enters view. */
export function flowDrawDelay(index: number) {
  return 0.1 + index * 0.03;
}

/** Reel-4 rule 1: entrances ease out. */
const SITE_EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];
const PRESS_DURATION = 0.22;
const RULE_DURATION = 0.5;

export function ExperienceFlowMark({
  index,
  total,
}: {
  readonly index: number;
  readonly total: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.6 });
  const reduceMotion = usePrefersReducedMotion();
  const delay = flowDrawDelay(index);
  const pressed = inView && !reduceMotion;

  return (
    <div ref={ref} className="journey-xp-flow-mark">
      {/* The press target must be keyed to the DRAW, not to mount: an
          opacity target of 1 in the pre-press branch would animate to
          settled while the row is still below the fold, and the number
          would already be pressed when it scrolls in (same class of bug
          as the iter-3 pen trace and the iter-4 venue stamp). Under
          reduced motion the number renders settled from the first frame. */}
      <motion.span
        aria-hidden="true"
        className="journey-xp-flow-num"
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
        <span aria-hidden="true" className="journey-xp-flow-dot" />
        {flowLabels(index, total).plate}
      </motion.span>
      <motion.span
        aria-hidden="true"
        className="journey-xp-flow-rule"
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
