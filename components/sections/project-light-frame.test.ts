import { describe, expect, it } from "vitest";

import { flowLabels, lightSweepDelay } from "./project-light-frame";

describe("flowLabels", () => {
  it("numbers rows from 01 with the total", () => {
    expect(flowLabels(0, 2)).toEqual({ num: "01", count: "01 / 02" });
    expect(flowLabels(1, 2)).toEqual({ num: "02", count: "02 / 02" });
  });

  it("never renders a zero total", () => {
    expect(flowLabels(0, 0)).toEqual({ num: "01", count: "01 / 01" });
  });
});

describe("lightSweepDelay", () => {
  it("starts after the 0.65s dither dissolve, staggered per row", () => {
    expect(lightSweepDelay(0)).toBe(0.7);
    expect(lightSweepDelay(1)).toBeCloseTo(0.73, 10);
  });
});
