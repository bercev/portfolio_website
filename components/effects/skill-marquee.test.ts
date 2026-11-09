import { describe, expect, it } from "vitest";

import { skillTapePopDelay, skillTapeStaggerIndex } from "./skill-marquee";

describe("skillTapeStaggerIndex", () => {
  it("wraps the duplicated loop copy back onto the original rhythm", () => {
    expect(skillTapeStaggerIndex(0, 9)).toBe(0);
    expect(skillTapeStaggerIndex(8, 9)).toBe(8);
    expect(skillTapeStaggerIndex(9, 9)).toBe(0);
    expect(skillTapeStaggerIndex(10, 9)).toBe(1);
  });

  it("is 0 when there are no pills", () => {
    expect(skillTapeStaggerIndex(3, 0)).toBe(0);
  });
});

describe("skillTapePopDelay", () => {
  it("leads 0.1s then staggers 30ms per tag", () => {
    expect(skillTapePopDelay(0, 9)).toBeCloseTo(0.1, 10);
    expect(skillTapePopDelay(1, 9)).toBeCloseTo(0.13, 10);
    expect(skillTapePopDelay(8, 9)).toBeCloseTo(0.34, 10);
  });

  it("pops the duplicated copy in phase with the original", () => {
    expect(skillTapePopDelay(9, 9)).toBeCloseTo(0.1, 10);
    expect(skillTapePopDelay(17, 9)).toBeCloseTo(0.34, 10);
  });
});
