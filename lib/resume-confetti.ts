import type { Options as ConfettiOptions } from "canvas-confetti";

const TOP_EDGE_ORIGINS = [0.1, 0.3, 0.5, 0.7, 0.9] as const;

export function getResumeConfettiBursts(): ConfettiOptions[] {
  return TOP_EDGE_ORIGINS.map((x) => ({
    particleCount: 18,
    angle: 270,
    spread: 55,
    startVelocity: 20,
    gravity: 0.85,
    scalar: 0.8,
    ticks: 220,
    origin: { x, y: 0 },
  }));
}
