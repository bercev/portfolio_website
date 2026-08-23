import type { Options as ConfettiOptions } from "canvas-confetti";

const TOP_EDGE_EMITTER_COUNT = 25;
const PARTICLES_PER_EMITTER = 8;

export function getResumeConfettiBursts(): ConfettiOptions[] {
  return Array.from({ length: TOP_EDGE_EMITTER_COUNT }, (_, index) => ({
    particleCount: PARTICLES_PER_EMITTER,
    angle: 270,
    spread: 32,
    startVelocity: 20,
    gravity: 0.85,
    scalar: 0.8,
    ticks: 220,
    origin: {
      x: (index + 0.5) / TOP_EDGE_EMITTER_COUNT,
      y: 0,
    },
  }));
}
