/**
 * Hero CTA as a stamped drawing plate (run-9 RUN9-HERO-CTA-PLATE, iter 22).
 *
 * The hero's one call to action was the last element on the page still in
 * pre-run-9 form: a bare underlined accent text link under a GATHER particle
 * BERAT with a drawn measure frame and a flipping tagline. It now speaks the
 * drafting-table language — a bordered plate with an inner margin frame, a
 * mono label, and a pen trace that draws the plate's outer frame on load
 * (same 0.9s accent trace as the project sheets, then fades to the quiet
 * CSS border). Press is the reel-4 0.97 scale, 220ms ease-out. On mobile
 * the plate stretches full-width so it reads as a thumb-sized control.
 *
 * Round 2: the "SHEET 05 — PROJECTS" kicker is gone — both critics called
 * it clutter competing with the rail's own "SHEET 01 / 07", and dropping
 * it (plus tighter padding) keeps the "Open to" signal row above the
 * 844px fold on mobile. The plate's identity is the border + inner
 * frame + mono label + trace, not the kicker.
 *
 * Semantics unchanged: the same anchor (href #projects, data-hero-cta,
 * "See my work" + arrow), the same MagneticButton drift around it, the
 * same 0.21s entrance stagger from hero.tsx. Reduced motion: no trace,
 * settled plate from the first frame (native hook — motion's
 * useReducedMotion() is unreliable in this app, run-9 iter 1).
 */
"use client";

import { motion } from "motion/react";

import { usePrefersReducedMotion } from "@/lib/use-prefers-reduced-motion";

/** Pen-trace timing: draws as the plate's entrance settles (wrap delay 0.21s). */
export function ctaTraceTiming() {
  return { delay: 0.5, duration: 0.9, fade: 0.4 };
}

/** Reel-4 press rule: buttons scale 0.97 on press. */
export const HERO_CTA_PRESS_SCALE = 0.97;

const SITE_EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

export function HeroCtaPlate() {
  const reduceMotion = usePrefersReducedMotion();
  const { delay, duration, fade } = ctaTraceTiming();
  const draw = !reduceMotion;

  return (
    <a href="#projects" className="cursor-target" data-hero-cta>
      {/* Pen trace: draws the plate frame, then fades so the quiet CSS
          border is the resting frame (same pattern as SheetFrame — the
          fade lives on the wrapping <g>, keyed to the draw, not mount). */}
      {draw ? (
        <span aria-hidden="true" className="hero-cta-trace">
          <svg viewBox="0 0 100 100" preserveAspectRatio="none">
            <motion.g
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 1, 1, 0] }}
              transition={{
                duration: duration + fade,
                delay,
                times: [0, 0.05, duration / (duration + fade), 1],
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
                animate={{ pathLength: 1 }}
                transition={{ duration, delay, ease: SITE_EASE }}
              />
            </motion.g>
          </svg>
        </span>
      ) : null}
      <span className="hero-cta-label">
        See my work{" "}
        <span aria-hidden="true" className="hero-cta-arrow">
          ↓
        </span>
      </span>
    </a>
  );
}
