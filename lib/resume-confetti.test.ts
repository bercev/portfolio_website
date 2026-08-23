import { describe, expect, it } from "vitest";

import { getResumeConfettiBursts } from "./resume-confetti";

describe("getResumeConfettiBursts", () => {
  it("forms an even, high-volume curtain across the top edge", () => {
    const bursts = getResumeConfettiBursts();
    const origins = bursts.map(({ origin }) => origin?.x ?? 0);

    expect(bursts).toHaveLength(25);
    expect(origins[0]).toBeCloseTo(0.02);
    expect(origins.at(-1)).toBeCloseTo(0.98);
    expect(
      origins.slice(1).every((x, index) =>
        Math.abs(x - origins[index] - 0.04) < Number.EPSILON * 10,
      ),
    ).toBe(true);
    expect(
      bursts.reduce((total, burst) => total + (burst.particleCount ?? 0), 0),
    ).toBe(200);
    expect(bursts.every(({ angle }) => angle === 270)).toBe(true);
    expect(bursts.every(({ origin }) => origin?.y === 0)).toBe(true);
  });
});
