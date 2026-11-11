/**
 * Hero CTA as a bead of light (run-10 RUN10-HERO-FLOW).
 *
 * Run 9's stamped drawing plate is gone — no border plate, no inner
 * margin frame, no pen trace. The call to action is a luminous pill:
 * a soft accent glow with a rounded-full form, so it reads as light
 * carried by the ribbons, not ink on paper. Press is the reel-4 0.97
 * scale, 220ms ease-out; the glow breathes slowly (3.2s) at rest and
 * lifts on hover. Reduced motion: settled pill from the first frame,
 * no breathing (the global reduced-motion rule kills the animation).
 *
 * Semantics unchanged: the same anchor (href #projects, data-hero-cta,
 * "See my work" + arrow), the same MagneticButton drift around it, the
 * same 0.21s entrance stagger from hero.tsx.
 */
"use client";

import { usePrefersReducedMotion } from "@/lib/use-prefers-reduced-motion";

/** Reel-4 press rule: buttons scale 0.97 on press. */
export const HERO_CTA_PRESS_SCALE = 0.97;

export function HeroCtaFlow() {
  const reduceMotion = usePrefersReducedMotion();

  return (
    <a href="#projects" className="cursor-target" data-hero-cta>
      <span className="hero-cta-label">
        See my work{" "}
        <span aria-hidden="true" className="hero-cta-arrow">
          ↓
        </span>
      </span>
      {/* The glow bead: a soft radial light behind the label that
          breathes with the ribbons. Purely visual (aria-hidden); the
          pill's own box-shadow is the resting glow. */}
      {!reduceMotion ? (
        <span aria-hidden="true" className="hero-cta-glow" />
      ) : null}
    </a>
  );
}
