/**
 * Drafting-table sheet frame for project rows (run-9 RUN9-SECTION-IDENTITIES,
 * first slice: Projects).
 *
 * The Projects section stops being bare ledger rows and becomes a stack of
 * engineering drawing sheets on the drafting table (iter 2's blueprint
 * background): each row is a bordered sheet with a FIG./SHEET header strip,
 * a PLATE caption under its preview, and a title block footer. The sheet
 * chrome lives in project-case-study.tsx + globals.css; this file is only
 * the pen trace — an accent stroke that draws the sheet's outer frame on
 * first scroll into view, then fades, leaving the quiet border — plus the
 * two registration "+" marks printed at the sheet's top corners.
 *
 * Sequencing: the row's dither dissolve runs 0.65s, so the trace starts at
 * 0.7s + the row stagger and is fully visible after the dissolve. Reduced
 * motion: no trace at all, marks render statically (native hook — motion's
 * useReducedMotion() is unreliable in this app, run-9 iter 1).
 */
"use client";

import { motion, useInView } from "motion/react";
import { useRef } from "react";

import { usePrefersReducedMotion } from "@/lib/use-prefers-reduced-motion";

/** Sheet number labels: "FIG. 01", "SHEET 01 / 02", "PLATE 01". */
export function sheetLabels(index: number, total: number) {
  const n = String(index + 1).padStart(2, "0");
  const t = String(Math.max(total, 1)).padStart(2, "0");
  return { fig: `FIG. ${n}`, sheet: `SHEET ${n} / ${t}`, plate: `PLATE ${n}` };
}

/** The pen trace starts as the dither dissolve finishes (0.65s) + row stagger. */
export function sheetDrawDelay(index: number) {
  return 0.7 + index * 0.03;
}

/** Reel-4 rule 1: entrances ease out. */
const SITE_EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];
const TRACE_DURATION = 0.9;
const TRACE_FADE = 0.4;

export function SheetFrame({ index }: { readonly index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.3 });
  const reduceMotion = usePrefersReducedMotion();
  const delay = sheetDrawDelay(index);
  const draw = inView && !reduceMotion;

  return (
    <div ref={ref} aria-hidden="true" className="journey-sheet-frame">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none">
        {/* The pen trace: draws the outer frame, then fades so the quiet
            CSS border is the resting frame. The fade lives on the wrapping
            <g> — opacity must be keyed to the DRAW, not to mount: an
            opacity target of 0 in the pre-draw branch would animate to 0
            while the sheet is still below the fold, and the trace would be
            invisible when it finally draws (caught by the iter-3 trace
            probe: dasharray 0→1 with opacity 0 throughout). Under reduced
            motion the group never renders (opacity 0 from the first frame). */}
        <motion.g
          initial={{ opacity: 0 }}
          animate={{ opacity: draw ? [0, 1, 1, 0] : 0 }}
          transition={{
            duration: TRACE_DURATION + TRACE_FADE,
            delay,
            times: [0, 0.05, TRACE_DURATION / (TRACE_DURATION + TRACE_FADE), 1],
            ease: "easeOut",
          }}
        >
          <motion.rect
            x="1"
            y="1"
            width="98"
            height="98"
            vectorEffect="non-scaling-stroke"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: draw ? 1 : 0 }}
            transition={{ duration: TRACE_DURATION, delay, ease: SITE_EASE }}
          />
        </motion.g>
      </svg>
      {/* Registration marks, printed on the sheet — static chrome, they
          fade in with the trace and stay. */}
      <motion.span
        aria-hidden="true"
        className="journey-sheet-crop journey-sheet-crop--left"
        initial={{ opacity: reduceMotion ? 1 : 0 }}
        animate={{ opacity: draw || reduceMotion ? 1 : 0 }}
        transition={
          reduceMotion ? { duration: 0 } : { duration: 0.4, delay: delay + 0.3 }
        }
      >
        +
      </motion.span>
      <motion.span
        aria-hidden="true"
        className="journey-sheet-crop journey-sheet-crop--right"
        initial={{ opacity: reduceMotion ? 1 : 0 }}
        animate={{ opacity: draw || reduceMotion ? 1 : 0 }}
        transition={
          reduceMotion ? { duration: 0 } : { duration: 0.4, delay: delay + 0.3 }
        }
      >
        +
      </motion.span>
    </div>
  );
}
