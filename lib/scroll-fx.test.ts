import { describe, expect, it } from "vitest";

import {
  approachAngle,
  ditherDissolveLevel,
  gazeAngles,
  objectDefocus,
  smoothstep01,
  velocityStretch,
} from "./scroll-fx";

describe("velocityStretch", () => {
  it("is exactly 0 at rest and below the calm threshold", () => {
    expect(velocityStretch(0)).toBe(0);
    expect(velocityStretch(200)).toBe(0);
    expect(velocityStretch(350)).toBe(0);
  });

  it("ramps smoothly between threshold and saturation", () => {
    const mid = velocityStretch(1475);
    expect(mid).toBeGreaterThan(0);
    expect(mid).toBeLessThan(1);
    // smoothstep01 is symmetric: midpoint of the ramp is ~0.5
    expect(mid).toBeCloseTo(smoothstep01(0.5), 5);
  });

  it("saturates at 1 for hard flings", () => {
    expect(velocityStretch(2600)).toBe(1);
    expect(velocityStretch(9000)).toBe(1);
  });

  it("clamps negative input to 0", () => {
    expect(velocityStretch(-100)).toBe(0);
  });

  it("is monotonic over the realistic speed range", () => {
    let prev = -1;
    for (const v of [0, 100, 349, 350, 500, 1000, 2000, 2599, 2600, 5000]) {
      const s = velocityStretch(v);
      expect(s).toBeGreaterThanOrEqual(prev);
      prev = s;
    }
  });
});

describe("objectDefocus", () => {
  it("is 0 at the window center (crisp on the focal plane)", () => {
    expect(objectDefocus(1)).toBe(0);
  });

  it("is maxBlur at the window edges (soft entrance/exit)", () => {
    expect(objectDefocus(0)).toBe(3);
    expect(objectDefocus(0, 5)).toBe(5);
  });

  it("ramps linearly between center and edges", () => {
    expect(objectDefocus(0.5)).toBeCloseTo(1.5, 10);
    expect(objectDefocus(0.25)).toBeCloseTo(2.25, 10);
  });

  it("clamps out-of-range envelopes", () => {
    expect(objectDefocus(-0.5)).toBe(3);
    expect(objectDefocus(1.5)).toBe(0);
  });
});

describe("ditherDissolveLevel", () => {
  it("maps the closed window to level 0 and the settled window to 15", () => {
    expect(ditherDissolveLevel(0)).toBe(0);
    expect(ditherDissolveLevel(1)).toBe(15);
  });

  it("sweeps the 16 Bayer levels monotonically", () => {
    let prev = -1;
    for (let i = 0; i <= 20; i++) {
      const lvl = ditherDissolveLevel(i / 20);
      expect(lvl).toBeGreaterThanOrEqual(prev);
      expect(lvl).toBeLessThanOrEqual(15);
      prev = lvl;
    }
    // mid-window dissolve passes roughly half the pattern
    expect(ditherDissolveLevel(0.5)).toBe(8);
  });

  it("clamps out-of-range envelopes", () => {
    expect(ditherDissolveLevel(-0.5)).toBe(0);
    expect(ditherDissolveLevel(1.5)).toBe(15);
  });
});

describe("gazeAngles", () => {
  it("is zero when the pointer sits on the bust center", () => {
    expect(gazeAngles(0, 0, 0.12, 0.07)).toEqual({ yaw: 0, pitch: 0 });
  });

  it("scales linearly with the normalized offset", () => {
    expect(gazeAngles(0.5, -0.25, 0.12, 0.07)).toEqual({
      yaw: 0.06,
      pitch: -0.0175,
    });
  });

  it("caps at the max turn past the box edges", () => {
    expect(gazeAngles(3, -5, 0.12, 0.07)).toEqual({ yaw: 0.12, pitch: -0.07 });
    expect(gazeAngles(-3, 5, 0.12, 0.07)).toEqual({ yaw: -0.12, pitch: 0.07 });
  });
});

describe("approachAngle", () => {
  it("does not move on a zero timestep", () => {
    expect(approachAngle(0.1, 0.5, 0)).toBe(0.1);
  });

  it("converges toward the target monotonically", () => {
    let a = 0;
    let prev = -Infinity;
    for (let i = 0; i < 120; i++) {
      a = approachAngle(a, 0.12, 1 / 15);
      expect(a).toBeGreaterThanOrEqual(prev);
      prev = a;
    }
    // ~90%+ converged after 8s at the default rate
    expect(a).toBeGreaterThan(0.11);
  });

  it("relaxes back toward zero when the pointer leaves", () => {
    let a = 0.12;
    for (let i = 0; i < 120; i++) a = approachAngle(a, 0, 1 / 15);
    expect(a).toBeLessThan(0.001);
  });
});
