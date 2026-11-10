import { describe, expect, it } from "vitest";

import {
  HERO_SIGNAL_PRESS_DURATION,
  HERO_SIGNAL_RULE_DURATION,
  heroSignalDrawDelay,
  heroSignalNumber,
} from "./hero-signals";

describe("heroSignalNumber", () => {
  it("zero-pads 1-based line numbers", () => {
    expect(heroSignalNumber(0)).toBe("01");
    expect(heroSignalNumber(1)).toBe("02");
    expect(heroSignalNumber(2)).toBe("03");
  });
});

describe("heroSignalDrawDelay", () => {
  it("starts after the plate entrance and staggers 45ms per line", () => {
    expect(heroSignalDrawDelay(0)).toBeCloseTo(0.5, 10);
    expect(heroSignalDrawDelay(1)).toBeCloseTo(0.545, 10);
    expect(heroSignalDrawDelay(2)).toBeCloseTo(0.59, 10);
  });
});

describe("hero signal timings", () => {
  it("presses in 220ms and draws the rule in 500ms", () => {
    expect(HERO_SIGNAL_PRESS_DURATION).toBe(0.22);
    expect(HERO_SIGNAL_RULE_DURATION).toBe(0.5);
  });
});
