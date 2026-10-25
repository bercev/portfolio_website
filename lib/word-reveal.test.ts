import { describe, expect, it } from "vitest";

import {
  WORD_REVEAL_FLOOR,
  ledeRevealProgress,
  wordRevealOpacity,
} from "./word-reveal";

describe("ledeRevealProgress", () => {
  it("is 0 while the lede top is below the start fraction", () => {
    expect(ledeRevealProgress(900, 1000)).toBe(0);
    expect(ledeRevealProgress(850, 1000)).toBe(0);
  });

  it("is 1 once the lede top reaches the end fraction", () => {
    expect(ledeRevealProgress(300, 1000)).toBe(1);
    expect(ledeRevealProgress(-200, 1000)).toBe(1);
  });

  it("is halfway when the lede top is midway between start and end", () => {
    expect(ledeRevealProgress(575, 1000)).toBeCloseTo(0.5, 10);
  });

  it("is full with a degenerate viewport rather than NaN", () => {
    expect(ledeRevealProgress(500, 0)).toBe(1);
  });
});

describe("wordRevealOpacity", () => {
  it("holds every word at the floor before the reveal starts", () => {
    for (let i = 0; i < 5; i++) {
      expect(wordRevealOpacity(0, i, 5)).toBe(WORD_REVEAL_FLOOR);
    }
  });

  it("lights words in order, one slice of progress each", () => {
    expect(wordRevealOpacity(0.2, 0, 5)).toBe(1);
    expect(wordRevealOpacity(0.2, 1, 5)).toBe(WORD_REVEAL_FLOOR);
    expect(wordRevealOpacity(0.5, 2, 5)).toBeCloseTo(0.7, 10);
  });

  it("is full for every word at progress 1 and never below the floor", () => {
    for (let i = 0; i < 5; i++) {
      expect(wordRevealOpacity(1, i, 5)).toBe(1);
      expect(wordRevealOpacity(0.37, i, 5)).toBeGreaterThanOrEqual(
        WORD_REVEAL_FLOOR,
      );
    }
  });

  it("is full with no words rather than NaN", () => {
    expect(wordRevealOpacity(0.5, 0, 0)).toBe(1);
  });
});
