import { describe, expect, it } from "vitest";

import {
  approachAngle,
  ditherDissolveLevel,
  gazeAngles,
  inspectFocusEnvelope,
  lightWashFalloff,
  MARQ_BOOST_MAX,
  MARQ_SKEW_MAX,
  MARQ_V_MAX,
  MARQ_V_MIN,
  marqueeBoost,
  marqueeSkewDeg,
  objectDefocus,
  pingEnvelope,
  pingRadius01,
  resolveChapterIndex,
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

describe("lightWashFalloff", () => {
  it("is 1 at the light center and 0 at/beyond the radius", () => {
    expect(lightWashFalloff(0, 280)).toBe(1);
    expect(lightWashFalloff(280, 280)).toBe(0);
    expect(lightWashFalloff(500, 280)).toBe(0);
  });

  it("decays monotonically with distance", () => {
    let prev = 2;
    for (const d of [0, 40, 80, 120, 160, 200, 240, 280]) {
      const f = lightWashFalloff(d, 280);
      expect(f).toBeLessThanOrEqual(prev);
      prev = f;
    }
  });

  it("is the smoothstep midpoint at half radius", () => {
    expect(lightWashFalloff(140, 280)).toBeCloseTo(smoothstep01(0.5), 5);
  });

  it("handles degenerate and negative input", () => {
    expect(lightWashFalloff(0, 0)).toBe(0);
    expect(lightWashFalloff(100, 0)).toBe(0);
    expect(lightWashFalloff(-50, 280)).toBe(1);
  });
});

describe("resolveChapterIndex", () => {
  it("picks the last chapter whose top is at or above the activation line", () => {
    expect(resolveChapterIndex([10, 200, 900], 360)).toBe(1);
    expect(resolveChapterIndex([10, 360, 900], 360)).toBe(1);
  });
  it("stays at 0 when every section is below the line", () => {
    expect(resolveChapterIndex([500, 1200], 360)).toBe(0);
  });
  it("reaches the last chapter at the document bottom", () => {
    expect(resolveChapterIndex([-4000, -3000, -900], 360)).toBe(2);
  });
  it("never activates a missing section passed as +Infinity", () => {
    expect(resolveChapterIndex([10, 200, Infinity], 360)).toBe(1);
  });
});

describe("pingEnvelope", () => {
  it("is 0 at 0, exactly 0 at and past duration", () => {
    expect(pingEnvelope(0)).toBe(0);
    expect(pingEnvelope(1.6)).toBe(0);
    expect(pingEnvelope(99)).toBe(0);
  });
  it("attacks fast to a peak then decays", () => {
    const peak = pingEnvelope(0.24); // t=0.15, end of attack
    expect(peak).toBeGreaterThan(0.9);
    expect(pingEnvelope(0.8)).toBeLessThan(peak);
    expect(pingEnvelope(1.4)).toBeLessThan(pingEnvelope(0.8));
  });
  it("stays inside 0..1 on a fine sweep", () => {
    for (let e = 0; e <= 1.6; e += 0.01) {
      const v = pingEnvelope(e);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
  });
  it("rejects degenerate input", () => {
    expect(pingEnvelope(-1)).toBe(0);
    expect(pingEnvelope(0.5, 0)).toBe(0);
    expect(pingEnvelope(0.5, -2)).toBe(0);
  });
});

describe("pingRadius01", () => {
  it("goes 0 -> 1 monotonically over the duration", () => {
    expect(pingRadius01(0)).toBe(0);
    expect(pingRadius01(1.6)).toBe(1);
    expect(pingRadius01(99)).toBe(1);
    let prev = -1;
    for (let e = 0; e <= 1.6; e += 0.05) {
      const v = pingRadius01(e);
      expect(v).toBeGreaterThanOrEqual(prev);
      prev = v;
    }
  });
});

describe("inspectFocusEnvelope", () => {
  it("leaves the envelope untouched at inspect=0", () => {
    expect(inspectFocusEnvelope(0, 0)).toBe(0);
    expect(inspectFocusEnvelope(0.5, 0)).toBe(0.5);
    expect(inspectFocusEnvelope(1, 0)).toBe(1);
  });

  it("pulls to full focus at inspect=1", () => {
    expect(inspectFocusEnvelope(0, 1)).toBe(1);
    expect(inspectFocusEnvelope(0.5, 1)).toBe(1);
    expect(inspectFocusEnvelope(1, 1)).toBe(1);
  });

  it("interpolates between envelope and full focus", () => {
    expect(inspectFocusEnvelope(0.5, 0.5)).toBeCloseTo(0.75, 10);
    expect(inspectFocusEnvelope(0, 0.25)).toBeCloseTo(0.25, 10);
  });

  it("clamps out-of-range inputs", () => {
    expect(inspectFocusEnvelope(-2, 0.5)).toBeGreaterThanOrEqual(0);
    expect(inspectFocusEnvelope(0.5, 99)).toBe(1);
    expect(inspectFocusEnvelope(2, 2)).toBe(1);
  });

  it("never exceeds 1 — inspect only pulls toward focus, never past it", () => {
    for (let e = 0; e <= 1; e += 0.1) {
      for (let iv = 0; iv <= 1; iv += 0.1) {
        const v = inspectFocusEnvelope(e, iv);
        expect(v).toBeGreaterThanOrEqual(e);
        expect(v).toBeLessThanOrEqual(1);
      }
    }
  });
});

describe("marqueeBoost", () => {
  it("is exactly 0 at rest and below the reading-speed deadband", () => {
    expect(marqueeBoost(0)).toBe(0);
    expect(marqueeBoost(MARQ_V_MIN - 1)).toBe(0);
    expect(marqueeBoost(-(MARQ_V_MIN - 1))).toBe(0);
  });

  it("ramps to MARQ_BOOST_MAX at hard-fling speeds and saturates", () => {
    expect(marqueeBoost(MARQ_V_MAX)).toBe(MARQ_BOOST_MAX);
    expect(marqueeBoost(9000)).toBe(MARQ_BOOST_MAX);
    const mid = marqueeBoost((MARQ_V_MIN + MARQ_V_MAX) / 2);
    expect(mid).toBeGreaterThan(0);
    expect(mid).toBeLessThan(MARQ_BOOST_MAX);
  });

  it("is monotonic in |v|", () => {
    let prev = -1;
    for (const v of [0, 60, 119, 120, 300, 800, 1599, 1600, 4000]) {
      const b = marqueeBoost(v);
      expect(b).toBeGreaterThanOrEqual(prev);
      prev = b;
    }
  });
});

describe("marqueeSkewDeg", () => {
  it("is exactly 0 at rest and inside the deadband", () => {
    expect(marqueeSkewDeg(0)).toBe(0);
    expect(marqueeSkewDeg(MARQ_V_MIN - 1)).toBe(0);
    expect(marqueeSkewDeg(-(MARQ_V_MIN - 1))).toBe(0);
  });

  it("leans into the scroll direction and caps at ±MARQ_SKEW_MAX", () => {
    expect(marqueeSkewDeg(MARQ_V_MAX)).toBe(MARQ_SKEW_MAX);
    expect(marqueeSkewDeg(-MARQ_V_MAX)).toBe(-MARQ_SKEW_MAX);
    expect(marqueeSkewDeg(9000)).toBe(MARQ_SKEW_MAX);
    expect(marqueeSkewDeg(-9000)).toBe(-MARQ_SKEW_MAX);
  });
});
