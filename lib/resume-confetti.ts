import type { Options as ConfettiOptions } from "canvas-confetti";

const TOP_EDGE_EMITTER_COUNT = 25;
const PARTICLES_PER_EMITTER = 8;

/** Delay between adjacent top-edge emitters so the curtain reads as a fall, not a flash. */
export const RESUME_CONFETTI_STAGGER_MS = 18;

export function getResumeConfettiBursts(): ConfettiOptions[] {
  return Array.from({ length: TOP_EDGE_EMITTER_COUNT }, (_, index) => ({
    particleCount: PARTICLES_PER_EMITTER,
    angle: 270,
    spread: 48,
    startVelocity: 12,
    gravity: 0.4,
    drift: index % 2 === 0 ? -0.15 : 0.15,
    scalar: 0.85,
    ticks: 520,
    decay: 0.91,
    origin: {
      x: (index + 0.5) / TOP_EDGE_EMITTER_COUNT,
      y: 0,
    },
  }));
}
