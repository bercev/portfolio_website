import { describe, expect, it } from "vitest";

import { skillCurrentPopDelay, skillCurrentStaggerIndex } from "./skill-marquee";

describe("skillCurrentStaggerIndex", () => {
  it("wraps the duplicated loop copy back onto the original rhythm", () => {
    expect(skillCurrentStaggerIndex(0, 9)).toBe(0);
    expect(skillCurrentStaggerIndex(8, 9)).toBe(8);
    expect(skillCurrentStaggerIndex(9, 9)).toBe(0);
    expect(skillCurrentStaggerIndex(10, 9)).toBe(1);
  });

  it("is 0 when there are no pills", () => {
    expect(skillCurrentStaggerIndex(3, 0)).toBe(0);
  });
});

describe("skillCurrentPopDelay", () => {
  it("leads 0.1s then staggers 30ms per tag", () => {
    expect(skillCurrentPopDelay(0, 9)).toBeCloseTo(0.1, 10);
    expect(skillCurrentPopDelay(1, 9)).toBeCloseTo(0.13, 10);
    expect(skillCurrentPopDelay(8, 9)).toBeCloseTo(0.34, 10);
  });

  it("pops the duplicated copy in phase with the original", () => {
    expect(skillCurrentPopDelay(9, 9)).toBeCloseTo(0.1, 10);
    expect(skillCurrentPopDelay(17, 9)).toBeCloseTo(0.34, 10);
  });
});
