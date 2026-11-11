import { describe, expect, it } from "vitest";

import { LIGHTFLOW_CYCLE_MS, lightFlowValue } from "./contact-light-flow";

describe("lightFlowValue", () => {
  it("stays within the wave's amplitude (never clips)", () => {
    for (let i = 0; i <= 1000; i++) {
      expect(Math.abs(lightFlowValue(i / 1000))).toBeLessThanOrEqual(1.001);
    }
  });

  it("swells both ways across a cycle", () => {
    let max = -Infinity;
    let min = Infinity;
    for (let i = 0; i <= 1000; i++) {
      const v = lightFlowValue(i / 1000);
      if (v > max) max = v;
      if (v < min) min = v;
    }
    expect(max).toBeGreaterThan(0.7);
    expect(min).toBeLessThan(-0.7);
  });

  it("is smooth (no heartbeat spikes)", () => {
    // A spike would jump between adjacent samples; the wave's steepest
    // sampled step stays far below the ECG's R-spike jump.
    let steepest = 0;
    for (let i = 0; i < 1000; i++) {
      const step = Math.abs(lightFlowValue((i + 1) / 1000) - lightFlowValue(i / 1000));
      if (step > steepest) steepest = step;
    }
    expect(steepest).toBeLessThan(0.02);
  });

  it("is periodic in the wave cycle", () => {
    // toBeCloseTo, not toBe: the phase normalization can differ by a
    // last-ulp between 0.36 and -0.64 + 1.
    expect(lightFlowValue(0.2)).toBeCloseTo(lightFlowValue(1.2), 12);
    expect(lightFlowValue(0.36)).toBeCloseTo(lightFlowValue(-0.64), 12);
    expect(LIGHTFLOW_CYCLE_MS).toBe(2000);
  });
});
