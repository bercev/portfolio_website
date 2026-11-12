import { describe, expect, it } from "vitest";

import {
  SPARKLE_BURST_MS,
  SPARKLE_FLASH_END_SCALE,
  SPARKLE_FLASH_MS,
  SPARKLE_FLASH_START_OPACITY,
  SPARKLE_FLASH_START_SCALE,
  SPARKLE_PARTICLE_COUNT,
  sparkleFlashAt,
  sparkleParticleAt,
  sparkleParticles,
  type SparkleParticle,
} from "./project-sparkle";

const particles = sparkleParticles();
const first = particles[0] as SparkleParticle;
const fourth = particles[3] as SparkleParticle;
const second = particles[1] as SparkleParticle;

describe("sparkleParticles", () => {
  it("bursts ten particles", () => {
    expect(particles).toHaveLength(SPARKLE_PARTICLE_COUNT);
  });

  it("spreads directions on the golden angle with no repeats", () => {
    const angles = particles.map((p) => p.angleDeg);
    expect(new Set(angles).size).toBe(SPARKLE_PARTICLE_COUNT);
    for (let i = 1; i < angles.length; i++) {
      const step = ((angles[i] as number) - (angles[i - 1] as number)) % 360;
      expect(step).toBeCloseTo(137.508, 3);
    }
  });

  it("uses three distance rings and two dashes", () => {
    expect(new Set(particles.map((p) => p.distancePx)).size).toBe(3);
    expect(particles.filter((p) => p.kind === "dash")).toHaveLength(2);
    expect(particles.filter((p) => p.kind === "dot")).toHaveLength(8);
  });

  it("ends inside the burst window and inside the viewport budget", () => {
    for (const p of particles) {
      expect(p.delayMs + p.durationMs).toBeLessThanOrEqual(SPARKLE_BURST_MS);
      const dist = Math.hypot(p.dx, p.dy);
      expect(dist).toBeLessThanOrEqual(46.0001);
      expect(dist).toBeGreaterThanOrEqual(21.9999);
    }
  });

  it("points each end position along its angle", () => {
    for (const p of particles) {
      const rad = (p.angleDeg * Math.PI) / 180;
      expect(p.dx).toBeCloseTo(Math.cos(rad) * p.distancePx, 10);
      expect(p.dy).toBeCloseTo(Math.sin(rad) * p.distancePx, 10);
    }
  });
});

describe("sparkleParticleAt", () => {
  it("sits invisible at the origin before its delay", () => {
    // Particle 3 starts at 75ms, so at 10ms it has not launched.
    expect(sparkleParticleAt(fourth, 10)).toEqual({
      x: 0,
      y: 0,
      opacity: 0,
      scale: 1,
    });
  });

  it("arrives at its end position, faded out, at the end of the flight", () => {
    const s = sparkleParticleAt(first, first.delayMs + first.durationMs);
    expect(s.x).toBeCloseTo(first.dx, 10);
    expect(s.y).toBeCloseTo(first.dy, 10);
    expect(s.opacity).toBeCloseTo(0, 10);
    expect(s.scale).toBeCloseTo(0.6, 10);
  });

  it("travels outward monotonically and holds full opacity mid-flight", () => {
    const t0 = second.delayMs + second.durationMs * 0.2;
    const t1 = second.delayMs + second.durationMs * 0.3;
    const s0 = sparkleParticleAt(second, t0);
    const s1 = sparkleParticleAt(second, t1);
    expect(Math.hypot(s1.x, s1.y)).toBeGreaterThan(Math.hypot(s0.x, s0.y));
    expect(s1.opacity).toBeCloseTo(1, 10);
    expect(s0.opacity).toBeGreaterThan(0);
  });

  it("holds full opacity through 55% of the flight, then fades", () => {
    const atHalf = sparkleParticleAt(
      second,
      second.delayMs + second.durationMs * 0.5,
    );
    expect(atHalf.opacity).toBeCloseTo(1, 10);
    const atEighty = sparkleParticleAt(
      second,
      second.delayMs + second.durationMs * 0.8,
    );
    expect(atEighty.opacity).toBeCloseTo(1 - (0.8 - 0.55) / 0.45, 10);
    expect(atEighty.opacity).toBeGreaterThan(0.3);
  });

  it("never leaves the burst window", () => {
    for (const p of particles) {
      const s = sparkleParticleAt(p, p.delayMs + p.durationMs + 500);
      expect(s.opacity).toBe(0);
      expect(Math.hypot(s.x, s.y)).toBeLessThanOrEqual(46);
    }
  });
});

describe("sparkleFlashAt", () => {
  it("starts small and bright", () => {
    const s = sparkleFlashAt(0);
    expect(s.scale).toBeCloseTo(SPARKLE_FLASH_START_SCALE, 10);
    expect(s.opacity).toBeCloseTo(SPARKLE_FLASH_START_OPACITY, 10);
  });

  it("expands and fades out by the end of the flash", () => {
    const s = sparkleFlashAt(SPARKLE_FLASH_MS);
    expect(s.scale).toBeCloseTo(SPARKLE_FLASH_END_SCALE, 10);
    expect(s.opacity).toBeCloseTo(0, 10);
  });

  it("is gone after the flash window", () => {
    expect(sparkleFlashAt(SPARKLE_FLASH_MS + 500).opacity).toBe(0);
  });

  it("grows monotonically and fades monotonically mid-flash", () => {
    const a = sparkleFlashAt(SPARKLE_FLASH_MS * 0.25);
    const b = sparkleFlashAt(SPARKLE_FLASH_MS * 0.75);
    expect(b.scale).toBeGreaterThan(a.scale);
    expect(b.opacity).toBeLessThan(a.opacity);
    expect(a.opacity).toBeGreaterThan(0);
  });
});
