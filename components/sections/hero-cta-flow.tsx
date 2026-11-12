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
 * RUN10-PULSE: a soft expanding ring rides the pill's border — the
 * 60fps Revolut RevPoints coachmark pulse. One 2.8s cycle: the ring
 * snaps out in the reel-4 200ms ease-out, fades over the next 780ms,
 * then rests invisible (see lib/hero-pulse.ts for the shared model).
 * The ring is a separate aria-hidden span so it can animate
 * independently of the breathing glow; like the glow it renders only
 * in full motion.
 *
 * Semantics unchanged: the same anchor (href #projects, data-hero-cta,
 * "See my work" + arrow), the same MagneticButton drift around it, the
 * same 0.21s entrance stagger from hero.tsx.
 *
 * RUN10-LASER: a beam of FROST light falls onto the pill on load,
 * splashes on its top edge, and pours over both corners (see
 * components/effects/hero-laser.tsx + lib/hero-laser.ts — rebuilt in
 * our own Canvas2D stack from the React Bits LaserFlow source, MIT +
 * Commons Clause, read in full). Hover (or keyboard focus) re-runs
 * the pour. The laser canvas sits under the label (z-index 0) so the
 * light touches the pill's edge, never the text; reduced motion draws
 * one settled frame.
 */
"use client";

import { usePrefersReducedMotion } from "@/lib/use-prefers-reduced-motion";

import { HeroLaser } from "@/components/effects/hero-laser";

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
      {/* RUN10-PULSE: the coachmark ring — an expanding border ring
          around the pill (see lib/hero-pulse.ts). Full motion only. */}
      {!reduceMotion ? (
        <span aria-hidden="true" className="hero-cta-pulse" data-hero-cta-pulse />
      ) : null}
      {/* RUN10-LASER: the light pour — beam, splash, rim, corner pools.
          Always mounted: reduced motion draws one settled frame. */}
      <HeroLaser reduceMotion={reduceMotion} />
    </a>
  );
}
