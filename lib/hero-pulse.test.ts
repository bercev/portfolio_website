import { describe, expect, it } from "vitest";

import {
  HERO_CTA_MOBILE_PILL_WIDTH_PX,
  HERO_CTA_NARROW_VIEWPORT_PX,
  HERO_CTA_PULSE_END_SCALE,
  HERO_CTA_PULSE_INSET_PX,
  HERO_CTA_PULSE_NARROW_END_SCALE,
  HERO_CTA_PULSE_NARROW_PEAK_SCALE,
  HERO_CTA_PULSE_PEAK_SCALE,
  HERO_PULSE_CYCLE_MS,
  HERO_PULSE_EXPAND_MS,
  HERO_PULSE_FADE_MS,
  HERO_PULSE_PEAK_OPACITY,
  RAIL_PULSE_END_SCALE,
  RAIL_PULSE_PEAK_SCALE,
  RIBBON_PULSE_END_SCALE,
  RIBBON_PULSE_PEAK_SCALE,
  easeOutCubic,
  heroPulseRingAt,
} from "./hero-pulse";

describe("heroPulseRingAt (CTA scales, uniform)", () => {
  it("starts invisible at scale 1", () => {
    const s = heroPulseRingAt(0, HERO_CTA_PULSE_PEAK_SCALE, HERO_CTA_PULSE_END_SCALE);
    expect(s.scaleX).toBe(1);
    expect(s.scaleY).toBe(1);
    expect(s.opacity).toBe(0);
  });

  it("reaches peak scale and peak opacity at the end of the 200ms expansion", () => {
    const s = heroPulseRingAt(
      HERO_PULSE_EXPAND_MS,
      HERO_CTA_PULSE_PEAK_SCALE,
      HERO_CTA_PULSE_END_SCALE,
    );
    expect(s.scaleX).toBeCloseTo(HERO_CTA_PULSE_PEAK_SCALE.x, 10);
    expect(s.scaleY).toBeCloseTo(HERO_CTA_PULSE_PEAK_SCALE.y, 10);
    expect(s.opacity).toBeCloseTo(HERO_PULSE_PEAK_OPACITY, 10);
  });

  it("is mid-expansion at 100ms (easeOutCubic, so past halfway)", () => {
    const s = heroPulseRingAt(100, HERO_CTA_PULSE_PEAK_SCALE, HERO_CTA_PULSE_END_SCALE);
    expect(s.scaleX).toBeCloseTo(
      1 + (HERO_CTA_PULSE_PEAK_SCALE.x - 1) * easeOutCubic(0.5),
      10,
    );
    expect(s.opacity).toBeCloseTo(HERO_PULSE_PEAK_OPACITY * easeOutCubic(0.5), 10);
    expect(s.opacity).toBeGreaterThan(HERO_PULSE_PEAK_OPACITY / 2);
  });

  it("is halfway faded at the midpoint of the fade phase", () => {
    const mid = HERO_PULSE_EXPAND_MS + HERO_PULSE_FADE_MS / 2;
    const s = heroPulseRingAt(mid, HERO_CTA_PULSE_PEAK_SCALE, HERO_CTA_PULSE_END_SCALE);
    expect(s.scaleX).toBeCloseTo(
      (HERO_CTA_PULSE_PEAK_SCALE.x + HERO_CTA_PULSE_END_SCALE.x) / 2,
      10,
    );
    expect(s.opacity).toBeCloseTo(HERO_PULSE_PEAK_OPACITY / 2, 10);
  });

  it("is fully faded at end scale when the fade ends", () => {
    const s = heroPulseRingAt(
      HERO_PULSE_EXPAND_MS + HERO_PULSE_FADE_MS,
      HERO_CTA_PULSE_PEAK_SCALE,
      HERO_CTA_PULSE_END_SCALE,
    );
    expect(s.scaleX).toBeCloseTo(HERO_CTA_PULSE_END_SCALE.x, 10);
    expect(s.scaleY).toBeCloseTo(HERO_CTA_PULSE_END_SCALE.y, 10);
    expect(s.opacity).toBe(0);
  });

  it("rests invisible at end scale until the cycle repeats", () => {
    const s = heroPulseRingAt(2000, HERO_CTA_PULSE_PEAK_SCALE, HERO_CTA_PULSE_END_SCALE);
    expect(s.scaleX).toBeCloseTo(HERO_CTA_PULSE_END_SCALE.x, 10);
    expect(s.opacity).toBe(0);
  });

  it("wraps: one cycle later is the same state, and negative times wrap", () => {
    const a = heroPulseRingAt(100, HERO_CTA_PULSE_PEAK_SCALE, HERO_CTA_PULSE_END_SCALE);
    const b = heroPulseRingAt(
      100 + HERO_PULSE_CYCLE_MS,
      HERO_CTA_PULSE_PEAK_SCALE,
      HERO_CTA_PULSE_END_SCALE,
    );
    const c = heroPulseRingAt(
      100 - HERO_PULSE_CYCLE_MS,
      HERO_CTA_PULSE_PEAK_SCALE,
      HERO_CTA_PULSE_END_SCALE,
    );
    expect(b).toEqual(a);
    expect(c).toEqual(a);
  });
});

describe("heroPulseRingAt (narrow mobile CTA ring)", () => {
  it("expands elliptically: barely wider, much taller", () => {
    const peak = heroPulseRingAt(
      HERO_PULSE_EXPAND_MS,
      HERO_CTA_PULSE_NARROW_PEAK_SCALE,
      HERO_CTA_PULSE_NARROW_END_SCALE,
    );
    expect(peak.scaleX).toBeCloseTo(HERO_CTA_PULSE_NARROW_PEAK_SCALE.x, 10);
    expect(peak.scaleY).toBeCloseTo(HERO_CTA_PULSE_NARROW_PEAK_SCALE.y, 10);
    expect(peak.scaleY).toBeGreaterThan(peak.scaleX);
    expect(peak.opacity).toBeCloseTo(HERO_PULSE_PEAK_OPACITY, 10);
  });

  it("matches the model at 100ms / 600ms (WAAPI freeze values)", () => {
    const at100 = heroPulseRingAt(
      100,
      HERO_CTA_PULSE_NARROW_PEAK_SCALE,
      HERO_CTA_PULSE_NARROW_END_SCALE,
    );
    expect(at100.scaleX).toBeCloseTo(1.02625, 4);
    expect(at100.scaleY).toBeCloseTo(1.245, 4);
    expect(at100.opacity).toBeCloseTo(0.48125, 4);
    const at600 = heroPulseRingAt(
      600,
      HERO_CTA_PULSE_NARROW_PEAK_SCALE,
      HERO_CTA_PULSE_NARROW_END_SCALE,
    );
    expect(at600.scaleX).toBeCloseTo(1.04026, 4);
    expect(at600.scaleY).toBeCloseTo(1.36718, 4);
    expect(at600.opacity).toBeCloseTo(0.26795, 4);
  });

  it("stays inside the 390px viewport at its widest phase", () => {
    // Ring box = pill width + 2× inset; at end scale it must fit the
    // viewport with room to spare — this is the iter-28 mobile
    // critic's defect (uniform 1.16× clipped past the viewport sides).
    const ringBoxWidth = HERO_CTA_MOBILE_PILL_WIDTH_PX + 2 * HERO_CTA_PULSE_INSET_PX;
    const widest = ringBoxWidth * HERO_CTA_PULSE_NARROW_END_SCALE.x;
    expect(widest).toBeLessThanOrEqual(HERO_CTA_NARROW_VIEWPORT_PX);
    expect(HERO_CTA_NARROW_VIEWPORT_PX - widest).toBeGreaterThanOrEqual(5);
    // And the uniform desktop ring would NOT fit (the defect, pinned).
    expect(ringBoxWidth * HERO_CTA_PULSE_END_SCALE.x).toBeGreaterThan(
      HERO_CTA_NARROW_VIEWPORT_PX,
    );
  });
});

describe("heroPulseRingAt (rail + ribbon scales)", () => {
  it("rail ring travels further than the CTA ring", () => {
    const rail = heroPulseRingAt(
      HERO_PULSE_EXPAND_MS,
      RAIL_PULSE_PEAK_SCALE,
      RAIL_PULSE_END_SCALE,
    );
    expect(rail.scaleX).toBeCloseTo(RAIL_PULSE_PEAK_SCALE.x, 10);
    expect(rail.scaleX).toBeGreaterThan(HERO_CTA_PULSE_PEAK_SCALE.x);
    const railEnd = heroPulseRingAt(
      HERO_PULSE_EXPAND_MS + HERO_PULSE_FADE_MS,
      RAIL_PULSE_PEAK_SCALE,
      RAIL_PULSE_END_SCALE,
    );
    expect(railEnd.scaleX).toBeCloseTo(RAIL_PULSE_END_SCALE.x, 10);
  });

  it("ribbon ring travels furthest (tiny dot, relatively larger ring)", () => {
    const ribbon = heroPulseRingAt(
      HERO_PULSE_EXPAND_MS,
      RIBBON_PULSE_PEAK_SCALE,
      RIBBON_PULSE_END_SCALE,
    );
    expect(ribbon.scaleX).toBeCloseTo(RIBBON_PULSE_PEAK_SCALE.x, 10);
    expect(ribbon.scaleX).toBeGreaterThan(RAIL_PULSE_PEAK_SCALE.x);
  });

  it("all three share the same timing: peak opacity at 200ms, gone at 980ms", () => {
    for (const [peak, end] of [
      [HERO_CTA_PULSE_PEAK_SCALE, HERO_CTA_PULSE_END_SCALE],
      [RAIL_PULSE_PEAK_SCALE, RAIL_PULSE_END_SCALE],
      [RIBBON_PULSE_PEAK_SCALE, RIBBON_PULSE_END_SCALE],
      [HERO_CTA_PULSE_NARROW_PEAK_SCALE, HERO_CTA_PULSE_NARROW_END_SCALE],
    ]) {
      expect(heroPulseRingAt(200, peak, end).opacity).toBeCloseTo(
        HERO_PULSE_PEAK_OPACITY,
        10,
      );
      expect(heroPulseRingAt(980, peak, end).opacity).toBe(0);
    }
  });
});
