import { describe, expect, it } from "vitest";

import {
  LIGHTFLOW_CYCLE_MS,
  lightFlowValue,
  mixWaveAccent,
  parseWaveAccent,
  waveAccentCss,
} from "./contact-light-flow";

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

describe("wave accent (RUN10-PRESETS fix4)", () => {
  it("parses computed rgb() colors and rejects anything else", () => {
    expect(parseWaveAccent("rgb(255, 170, 80)")).toEqual({
      r: 255,
      g: 170,
      b: 80,
    });
    expect(parseWaveAccent("rgb(125,211,252)")).toEqual({
      r: 125,
      g: 211,
      b: 252,
    });
    // Custom properties come back verbatim as authored hex (they are
    // not @property-registered), so the hex branch is the live path.
    expect(parseWaveAccent("#ffaa50")).toEqual({
      r: 255,
      g: 170,
      b: 80,
    });
    expect(parseWaveAccent("#7dd3fc")).toEqual({
      r: 125,
      g: 211,
      b: 252,
    });
    expect(parseWaveAccent("#fff")).toEqual({
      r: 255,
      g: 255,
      b: 255,
    });
    expect(parseWaveAccent("#gg0000")).toBeNull();
    expect(parseWaveAccent("")).toBeNull();
    expect(parseWaveAccent("rgb(300, 0, 0)")).toBeNull();
  });

  it("mixes accents end to end and serializes back to css", () => {
    const cyan = { r: 125, g: 211, b: 252 };
    const gold = { r: 255, g: 170, b: 80 };
    expect(mixWaveAccent(cyan, gold, 0)).toEqual(cyan);
    expect(mixWaveAccent(cyan, gold, 1)).toEqual(gold);
    // Midpoint of the goldenHour crossfade: red leads blue by a clear
    // margin, so the wave reads warm through the whole tween.
    const mid = mixWaveAccent(cyan, gold, 0.5);
    expect(mid).toEqual({ r: 190, g: 191, b: 166 });
    expect(mid.r - mid.b).toBeGreaterThan(20);
    expect(waveAccentCss(gold)).toBe("rgb(255, 170, 80)");
  });
});
