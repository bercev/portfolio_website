import { describe, expect, it } from "vitest";

import { flowLabels, glowDelay } from "./publication-flow";

describe("flowLabels", () => {
  it("numbers rows from 01 with the total, no drafting words", () => {
    expect(flowLabels(0, 2)).toEqual({
      fig: "01",
      plate: "01 / 02",
    });
    expect(flowLabels(1, 2)).toEqual({
      fig: "02",
      plate: "02 / 02",
    });
  });

  it("never renders a zero total", () => {
    expect(flowLabels(0, 0)).toEqual({
      fig: "01",
      plate: "01 / 01",
    });
  });
});

describe("glowDelay", () => {
  it("starts after the 0.65s dither dissolve, staggered per row", () => {
    expect(glowDelay(0)).toBe(0.7);
    expect(glowDelay(1)).toBeCloseTo(0.73, 10);
  });
});
