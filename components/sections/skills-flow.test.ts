import { describe, expect, it } from "vitest";

import { flowDelay, seriesKicker } from "./skills-flow";

describe("seriesKicker", () => {
  it("numbers series as flow labels with the right noun", () => {
    expect(seriesKicker(0, 7, 4)).toBe("01 / 04 · 7 SKILLS");
    expect(seriesKicker(1, 1, 4)).toBe("02 / 04 · 1 SKILL");
  });
});

describe("flowDelay", () => {
  it("staggers 45ms per cell across each row of three, then wraps", () => {
    expect(flowDelay(0)).toBe(0);
    expect(flowDelay(1)).toBeCloseTo(0.045, 10);
    expect(flowDelay(2)).toBeCloseTo(0.09, 10);
    expect(flowDelay(3)).toBe(0);
  });
});
