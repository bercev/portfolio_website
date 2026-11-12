/**
 * Light-burst micro-interaction (run-10 RUN10-SPARKLE).
 *
 * 60fps Circle bubbles pop #2130 + Duolingo sparkle sculpt pop #2123,
 * React Bits Click Spark / Prismatic Burst as direction references,
 * rebuilt in the site's own Motion stack: on a hover-enter / focus /
 * tap (`burst` increments), ten tiny FROST-cyan particles — eight
 * glowing dots, two short dashes — fan out from the burst origin on a
 * golden-angle spread, ease out 26–54px, and fade by the end of their
 * ~650ms flight (see lib/project-sparkle.ts for the model). The
 * origin is the parent's light source: a project row's header glow
 * dot, a skill cell's top-right corner.
 *
 * The layer is zero-size, absolutely positioned by its parent, and
 * pointer-events none, so it can never shift layout or swallow a
 * click. It mounts keyed by `burst`, so every new increment replays
 * the flight from the origin. Reduced motion: nothing renders at all
 * (native hook — motion's useReducedMotion() is unreliable in this
 * app, run-9 iter 1).
 */
"use client";

import { motion } from "motion/react";

import {
  SPARKLE_FLASH_END_SCALE,
  SPARKLE_FLASH_MS,
  SPARKLE_FLASH_START_OPACITY,
  SPARKLE_FLASH_START_SCALE,
  sparkleParticles,
} from "@/lib/project-sparkle";
import { usePrefersReducedMotion } from "@/lib/use-prefers-reduced-motion";

/** easeOutCubic — matches lib/project-sparkle.ts's flight easing. */
const SITE_EASE: [number, number, number, number] = [0.215, 0.61, 0.355, 1];

export function SparkleBurst({ burst }: { readonly burst: number }) {
  const reduceMotion = usePrefersReducedMotion();
  if (reduceMotion || burst === 0) return null;

  return (
    <span
      key={burst}
      data-sparkle-burst
      aria-hidden="true"
      className="journey-sparkle-burst"
    >
      {/* Origin flash: a brief expanding glow at the burst origin so
          the eye registers one event at the dot/cell corner — the 4px
          particles alone did not read at full-viewport scale (iter-29
          critics, round 1). It expands and fades within 350ms. */}
      <motion.span
        data-sparkle-flash
        aria-hidden="true"
        className="journey-sparkle-flash"
        initial={{
          scale: SPARKLE_FLASH_START_SCALE,
          opacity: SPARKLE_FLASH_START_OPACITY,
        }}
        animate={{ scale: SPARKLE_FLASH_END_SCALE, opacity: 0 }}
        transition={{ duration: SPARKLE_FLASH_MS / 1000, ease: SITE_EASE }}
      />
      {sparkleParticles().map((particle) => (
        <motion.span
          key={particle.index}
          data-sparkle-particle
          data-sparkle-kind={particle.kind}
          className="journey-sparkle-particle"
          initial={{
            x: 0,
            y: 0,
            opacity: 0,
            scale: 1,
            rotate: particle.kind === "dash" ? particle.angleDeg : 0,
          }}
          animate={{
            x: particle.dx,
            y: particle.dy,
            opacity: [0, 1, 1, 0],
            scale: 0.6,
          }}
          transition={{
            duration: particle.durationMs / 1000,
            delay: particle.delayMs / 1000,
            ease: SITE_EASE,
            // Matches sparkleParticleAt: fade-in over the first 12%,
            // full opacity through 55%, fade out by the end.
            times: [0, 0.12, 0.55, 1],
          }}
        />
      ))}
    </span>
  );
}
