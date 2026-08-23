import { describe, expect, it } from "vitest";

import { getResumeConfettiBursts } from "./resume-confetti";

describe("getResumeConfettiBursts", () => {
  it("spreads downward-facing bursts across the top edge", () => {
    const bursts = getResumeConfettiBursts();

    expect(bursts).toHaveLength(5);
    expect(bursts.map(({ origin }) => origin)).toEqual([
      { x: 0.1, y: 0 },
      { x: 0.3, y: 0 },
      { x: 0.5, y: 0 },
      { x: 0.7, y: 0 },
      { x: 0.9, y: 0 },
    ]);
    expect(bursts.every(({ angle }) => angle === 270)).toBe(true);
  });
});
