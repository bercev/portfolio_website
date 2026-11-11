/**
 * Paper-page sign-off (run-10 RUN10-PAPERS): the author's name signed
 * under the BibTeX panel as a trace of light — the same hand-drawn SVG
 * signature strokes, now in accent neon with a soft glow, drawing
 * themselves in on first scroll into view (60fps Run Receipt Signature
 * Interaction transfer: trigger → 1.4s pen draw → settle). Reduced
 * motion: fully drawn from the first frame (native hook — motion's
 * useReducedMotion() is unreliable in this app, run-9 iter 1). The
 * signature is a stroke path, never a font — it must read as drawn,
 * not typed.
 */
"use client";

import { motion, useInView } from "motion/react";
import { useRef } from "react";

import { usePrefersReducedMotion } from "@/lib/use-prefers-reduced-motion";

/** Reel-4 rule 1: entrances ease out. */
const SITE_EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

/**
 * The signature strokes, drawn in sequence in a 260×84 box: the name
 * scrawl (tall initial, connected humps, terminal flick), then the
 * underline flourish sweeping under it and flicking up at the right end.
 */
export const SIGNATURE_STROKES: readonly {
  readonly d: string;
  readonly duration: number;
  readonly delay: number;
}[] = [
  {
    d: "M 16 60 C 8 44 12 18 26 13 C 38 9 45 20 37 29 C 31 36 23 39 27 47 C 31 55 45 55 49 45 C 52 38 47 32 41 36 C 52 52 56 28 66 38 C 74 46 72 58 82 50 C 92 46 94 40 104 44 C 112 47 110 58 120 50 C 128 44 126 26 136 36 C 143 43 141 52 150 44",
    duration: 1.15,
    delay: 0,
  },
  {
    d: "M 10 72 C 70 80 180 78 238 60 C 246 57 252 50 250 44",
    duration: 0.5,
    delay: 0.95,
  },
];

/** Total draw time: the flourish lands 0.2s after the name finishes. */
export function signatureDrawDuration(): number {
  return Math.max(...SIGNATURE_STROKES.map((s) => s.delay + s.duration));
}

export function PaperSignature() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.6 });
  const reduceMotion = usePrefersReducedMotion();
  // The draw target must be keyed to the DRAW, not to mount: a pathLength
  // target of 1 in the pre-view branch would animate to drawn while the
  // sign-off is still below the fold (same class of bug as the iter-3 pen
  // trace and the iter-4 stamp). Under reduced motion it renders drawn
  // from the first frame.
  const drawn = inView || reduceMotion;

  return (
    <div ref={ref} data-paper-signoff className="journey-pub-signoff">
      <p className="journey-pub-signoff-kicker">Signed —</p>
      <svg
        className="journey-pub-signature"
        viewBox="0 0 260 84"
        aria-hidden="true"
      >
        {SIGNATURE_STROKES.map((stroke, i) => (
          <motion.path
            key={i}
            d={stroke.d}
            initial={{ pathLength: reduceMotion ? 1 : 0 }}
            animate={{ pathLength: drawn ? 1 : 0 }}
            transition={
              reduceMotion
                ? { duration: 0 }
                : {
                    duration: stroke.duration,
                    delay: stroke.delay,
                    ease: SITE_EASE,
                  }
            }
          />
        ))}
      </svg>
      <p className="journey-pub-signoff-name">Berat Ercevik</p>
    </div>
  );
}
