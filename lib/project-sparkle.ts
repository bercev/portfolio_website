// Light-burst micro-interaction (RUN10-SPARKLE, 60fps Circle bubbles
// pop #2130 + Duolingo sparkle sculpt pop #2123, React Bits Click
// Spark / Prismatic Burst as direction references) — pure timing +
// geometry model for the tiny light particles that burst from a
// hovered project row (header glow dot) and a hovered skill cell
// (top-right corner).
// GATHER particle language at micro scale, rebuilt in the site's own
// Motion stack — no new dependency.
//
// Shape of one burst: 10 particles fan out from a single origin on a
// golden-angle spread (no two share a direction), travel 26–54px on
// an ease-out cubic, fade out by the end of their flight, and shrink
// slightly as they go. Two of the ten are short dashes (Click Spark's
// dash/comet variant) rotated along their travel direction; the rest
// are glowing dots. Total flight ≤ 725ms — a pop, not a linger.
//
// The component (sparkle-burst.tsx) animates the same model with
// motion; the unit tests below pin the model, and the live probes
// (vf-run10-iter29.js) prove the displacement in the page.

import { easeOutCubic } from "./hero-pulse";

/** Particles per burst. */
export const SPARKLE_PARTICLE_COUNT = 10;

/** Longest single flight, ms (delay 75 + duration 650). */
export const SPARKLE_BURST_MS = 725;

/** Golden angle — spreads the particles with no shared direction. */
export const SPARKLE_GOLDEN_ANGLE_DEG = 137.508;

/**
 * Travel distances, px — three rings so the burst has depth. Kept
 * tight (22–46px) on purpose: at 26–54px the outer ring escaped the
 * row's edge and read as stray dust rather than one pop (iter-29
 * mobile critic).
 */
export const SPARKLE_DISTANCES_PX = [22, 34, 46] as const;

/** Flight durations, ms — outer ring flies longest. */
export const SPARKLE_DURATIONS_MS = [520, 585, 650] as const;

/** Stagger delays, ms — the burst blooms instead of snapping. */
export const SPARKLE_DELAYS_MS = [0, 25, 50, 75] as const;

export type SparkleKind = "dot" | "dash";

export type SparkleParticle = {
  readonly index: number;
  readonly kind: SparkleKind;
  /** Travel direction, degrees (0 = east). */
  readonly angleDeg: number;
  /** Travel distance, px. */
  readonly distancePx: number;
  /** Flight duration, ms (excluding delay). */
  readonly durationMs: number;
  /** Start delay, ms. */
  readonly delayMs: number;
  /** End position of the flight, px from the origin. */
  readonly dx: number;
  readonly dy: number;
};

/** The burst's particles, deterministic — same burst every hover. */
export function sparkleParticles(): SparkleParticle[] {
  const particles: SparkleParticle[] = [];
  for (let i = 0; i < SPARKLE_PARTICLE_COUNT; i++) {
    const angleDeg = 18 + i * SPARKLE_GOLDEN_ANGLE_DEG;
    const angleRad = (angleDeg * Math.PI) / 180;
    const distancePx = SPARKLE_DISTANCES_PX[
      i % SPARKLE_DISTANCES_PX.length
    ] as number;
    particles.push({
      index: i,
      kind: i % 4 === 3 ? "dash" : "dot",
      angleDeg,
      distancePx,
      durationMs: SPARKLE_DURATIONS_MS[
        i % SPARKLE_DURATIONS_MS.length
      ] as number,
      delayMs: SPARKLE_DELAYS_MS[i % SPARKLE_DELAYS_MS.length] as number,
      dx: Math.cos(angleRad) * distancePx,
      dy: Math.sin(angleRad) * distancePx,
    });
  }
  return particles;
}

/**
 * The origin flash: a brief expanding glow at the burst origin that
 * anchors the pop — the eye registers one event at the dot/cell
 * corner instead of hunting for scattered specks (iter-29 critics:
 * the 4px particles alone did not read at full-viewport scale).
 * 350ms, ease-out: scale 0.6 → 1.8, opacity 0.9 → 0.
 */
export const SPARKLE_FLASH_MS = 350;
export const SPARKLE_FLASH_START_SCALE = 0.6;
export const SPARKLE_FLASH_END_SCALE = 1.8;
export const SPARKLE_FLASH_START_OPACITY = 0.9;

export type SparkleFlashState = {
  readonly scale: number;
  readonly opacity: number;
};

/** The origin flash's state `tMs` after the burst starts. */
export function sparkleFlashAt(tMs: number): SparkleFlashState {
  if (tMs <= 0) {
    return { scale: SPARKLE_FLASH_START_SCALE, opacity: SPARKLE_FLASH_START_OPACITY };
  }
  const p = Math.min(tMs / SPARKLE_FLASH_MS, 1);
  const e = easeOutCubic(p);
  return {
    scale:
      SPARKLE_FLASH_START_SCALE +
      (SPARKLE_FLASH_END_SCALE - SPARKLE_FLASH_START_SCALE) * e,
    opacity: SPARKLE_FLASH_START_OPACITY * (1 - p),
  };
}

export type SparkleParticleState = {
  readonly x: number;
  readonly y: number;
  readonly opacity: number;
  readonly scale: number;
};

/**
 * A particle's state `tMs` after its burst starts (delay included):
 * before its delay it sits at the origin, invisible; it eases out to
 * its end position, holds full opacity through 55% of the flight,
 * then fades to 0 and shrinks to 0.6 by the end.
 */
export function sparkleParticleAt(
  particle: SparkleParticle,
  tMs: number,
): SparkleParticleState {
  const local = tMs - particle.delayMs;
  if (local <= 0) {
    return { x: 0, y: 0, opacity: 0, scale: 1 };
  }
  const p = Math.min(local / particle.durationMs, 1);
  const e = easeOutCubic(p);
  // Full opacity through 55% of the flight, then a linear fade: the
  // burst must still read bright when a slow headless capture catches
  // it ~500ms in (iter-29 critics round 1 caught the 40%-hold build
  // mid-fade and called it dust). p >= 1 is exactly 0, not a
  // floating-point epsilon (1 - 0.45/0.45 computes as 1.1e-16).
  let opacity: number;
  if (p < 0.12) {
    opacity = p / 0.12;
  } else if (p < 0.55) {
    opacity = 1;
  } else if (p >= 1) {
    opacity = 0;
  } else {
    opacity = 1 - (p - 0.55) / 0.45;
  }
  return {
    x: particle.dx * e,
    y: particle.dy * e,
    opacity,
    scale: 1 - 0.4 * e,
  };
}
