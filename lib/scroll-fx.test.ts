import { describe, expect, it } from "vitest";

import {
  answerSpinEnvelope,
  ANSWER_SPIN_CUTOFF_S,
  ANSWER_SPIN_RATE,
  ANSWER_SPIN_TAU_S,
  answerWireEnvelope,
  ANSWER_WIRE_CUTOFF_S,
  ANSWER_WIRE_RISE_S,
  ANSWER_WIRE_TAU_S,
  approachAngle,
  attentionStep,
  attentionTargetYaw,
  ATTENTION_FRAC,
  ATTENTION_IDLE_MS,
  ATTENTION_REST,
  ATTENTION_SETTLE_TICKS,
  ATTENTION_STARE_MS,
  ATTENTION_VEL_DEADBAND,
  type AttentionState,
  bustGhostErase,
  BUST_GHOST_DEADBAND,
  BUST_GHOST_ERASE_CAP,
  BUST_GHOST_GAIN,
  objectGhostErase,
  OBJECT_GHOST_DEADBAND,
  OBJECT_GHOST_ERASE_CAP,
  OBJECT_GHOST_GAIN,
  bustLightPresence,
  bustRimLight,
  bustRimShaped,
  BUST_WIPE_MAX_DROP,
  bustWipeDepth,
  boundaryShapeGlyph,
  bustWipeDrop,
  chapterCrossingScrollY,
  computeScrollSnapshot,
  contactFaceRamp,
  ditherDissolveLevel,
  fbm2,
  gazeAngles,
  glanceYawOffset,
  GLANCE_AMP_RAD,
  GLANCE_CUTOFF_MS,
  GLANCE_DIR,
  GLANCE_TAU_MS,
  hash2,
  inspectFocusEnvelope,
  lightWashFalloff,
  MARQ_BOOST_MAX,
  MARQ_SKEW_MAX,
  MARQ_V_MAX,
  MARQ_V_MIN,
  marqueeBoost,
  marqueeSkewDeg,
  objectDefocus,
  objectPrecession,
  objectGlanceDir,
  OBJECT_WINDOWS,
  objectWindowCrossed,
  objectWindowPos,
  pingEnvelope,
  pingRadius01,
  shouldFireKeyRipple,
  transmitBurstOrigin,
  resolveChapterIndex,
  shapeGlyphForTangent,
  smoothstep01,
  valueNoise2,
  velocityStretch,
  chromaOffsetPx,
  CHROMA_PX_MAX,
  constellationEnvelope,
  CONSTELLATION_ALPHA_MAX,
  CONSTELLATION_CUTOFF_S,
  CONSTELLATION_TAU_S,
  constellationSegment,
  dominantObject,
  flingStormLevel,
  railBeamLength,
  RAIL_BEAM_BASE,
  RAIL_BEAM_MAX,
  spotlightAlphaStep,
  spotlightBlurTaper,
  spotlightCenterX,
  spotlightTargetAlpha,
  SPOTLIGHT_ALPHA_MAX,
  wipeGlyphChar,
  wipeRawFrac,
  wipeSweepThreshold,
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

describe("chromaOffsetPx", () => {
  it("is exactly 0 at rest and below the deadband (at-rest contract)", () => {
    expect(chromaOffsetPx(0)).toBe(0);
    expect(chromaOffsetPx(150)).toBe(0);
    expect(chromaOffsetPx(299)).toBe(0);
  });

  it("uses |velocity|: negative flings split identically", () => {
    expect(chromaOffsetPx(-1500)).toBe(chromaOffsetPx(1500));
    expect(chromaOffsetPx(-299)).toBe(0);
  });

  it("ramps smoothly between deadband and saturation", () => {
    const mid = chromaOffsetPx(1250);
    expect(mid).toBeGreaterThan(0);
    expect(mid).toBeLessThan(CHROMA_PX_MAX);
    // smoothstep01 is symmetric: midpoint of the ramp is ~0.5 of the cap
    expect(mid).toBeCloseTo(CHROMA_PX_MAX * smoothstep01(0.5), 5);
  });

  it("saturates at CHROMA_PX_MAX for hard flings", () => {
    expect(chromaOffsetPx(2200)).toBe(CHROMA_PX_MAX);
    expect(chromaOffsetPx(9000)).toBe(CHROMA_PX_MAX);
  });

  it("is monotonic over the realistic speed range", () => {
    let prev = -1;
    for (const v of [0, 100, 299, 300, 500, 1250, 2000, 2199, 2200, 8000]) {
      const s = chromaOffsetPx(v);
      expect(s).toBeGreaterThanOrEqual(prev);
      prev = s;
    }
  });

  it("returns 0 for degenerate input (NaN/±Infinity)", () => {
    expect(chromaOffsetPx(NaN)).toBe(0);
    expect(chromaOffsetPx(Infinity)).toBe(0);
    expect(chromaOffsetPx(-Infinity)).toBe(0);
  });
});

describe("flingStormLevel", () => {
  it("is exactly 0 at rest and below the deadband", () => {
    expect(flingStormLevel(0, 0)).toBe(0);
    expect(flingStormLevel(299, 0)).toBe(0);
    expect(flingStormLevel(-299, 0)).toBe(0);
  });

  it("uses |velocity|: negative flings storm identically", () => {
    expect(flingStormLevel(-1500, 0)).toBe(flingStormLevel(1500, 0));
  });

  it("is exactly 0 at full blur even on a hard fling (no mush)", () => {
    expect(flingStormLevel(9000, 5)).toBe(0);
    expect(flingStormLevel(9000, 7)).toBe(0);
  });

  it("scales linearly with sharpness at fixed velocity", () => {
    const full = flingStormLevel(2200, 0);
    expect(full).toBe(1);
    expect(flingStormLevel(2200, 2.5)).toBeCloseTo(0.5, 10);
    expect(flingStormLevel(2200, 1)).toBeCloseTo(0.8, 10);
  });

  it("returns 0 for degenerate input (NaN/±Infinity)", () => {
    expect(flingStormLevel(NaN, 0)).toBe(0);
    expect(flingStormLevel(1500, NaN)).toBe(0);
    expect(flingStormLevel(Infinity, 0)).toBe(0);
  });
});

describe("railBeamLength", () => {
  it("is exactly the base length at rest and below the deadband", () => {
    expect(railBeamLength(0)).toBe(RAIL_BEAM_BASE);
    expect(railBeamLength(299)).toBe(RAIL_BEAM_BASE);
    expect(railBeamLength(-299)).toBe(RAIL_BEAM_BASE);
  });

  it("uses |velocity|: negative flings stretch identically", () => {
    expect(railBeamLength(-1500)).toBe(railBeamLength(1500));
  });

  it("caps at the max on and above a hard fling", () => {
    expect(railBeamLength(2200)).toBe(RAIL_BEAM_MAX);
    expect(railBeamLength(9000)).toBe(RAIL_BEAM_MAX);
  });

  it("eases through the midpoint (smoothstep, not linear)", () => {
    expect(railBeamLength(1250)).toBeCloseTo(
      RAIL_BEAM_BASE + (RAIL_BEAM_MAX - RAIL_BEAM_BASE) * 0.5,
      10,
    );
  });

  it("falls back to the base length for degenerate input", () => {
    expect(railBeamLength(NaN)).toBe(RAIL_BEAM_BASE);
    expect(railBeamLength(Infinity)).toBe(RAIL_BEAM_BASE);
  });
});

describe("chapter spotlight", () => {
  it("targets the cap outside contact, exactly 0 inside it", () => {
    expect(spotlightTargetAlpha(0)).toBe(SPOTLIGHT_ALPHA_MAX);
    expect(spotlightTargetAlpha(5)).toBe(SPOTLIGHT_ALPHA_MAX);
    expect(spotlightTargetAlpha(6)).toBe(0);
  });

  it("returns 0 for out-of-range and degenerate chapter indices", () => {
    expect(spotlightTargetAlpha(-1)).toBe(0);
    expect(spotlightTargetAlpha(7)).toBe(0);
    expect(spotlightTargetAlpha(NaN)).toBe(0);
  });

  it("halves (never zeroes) the glow at full blur — the state survives depth", () => {
    expect(spotlightBlurTaper(0)).toBe(1);
    expect(spotlightBlurTaper(5)).toBe(0.5);
    expect(spotlightBlurTaper(2.5)).toBe(0.75);
    expect(spotlightBlurTaper(9)).toBe(0.5);
    expect(spotlightBlurTaper(NaN)).toBe(0);
  });

  it("centers on the viewport on mobile, on the 7/12 reading column on desktop", () => {
    expect(spotlightCenterX(390)).toBe(195);
    expect(spotlightCenterX(900)).toBe(450);
    // 1280: shell 1200, offset 40, pad 64, gap 21.76 → center ≈ 412.1
    expect(spotlightCenterX(1280)).toBeCloseTo(412.13, 1);
    // Wider viewports keep the 1200px shell centered (gap grows with vw, so not exactly w/2)
    expect(spotlightCenterX(1600)).toBeCloseTo(571, 0);
    expect(spotlightCenterX(0)).toBe(0);
    expect(spotlightCenterX(NaN)).toBe(0);
  });

  it("eases ~95% toward the target in 600ms and snaps exactly on settle", () => {
    expect(spotlightAlphaStep(0, 0.12, 0.6)).toBeCloseTo(0.114, 3);
    expect(spotlightAlphaStep(0.1195, 0.12, 0.6)).toBe(0.12);
    expect(spotlightAlphaStep(0.12, 0, 0.6)).toBeCloseTo(0.006, 3);
    expect(spotlightAlphaStep(0.0005, 0, 0.6)).toBe(0);
  });

  it("holds on dt<=0 and returns 0 for degenerate inputs", () => {
    expect(spotlightAlphaStep(0.05, 0.12, 0)).toBe(0.05);
    expect(spotlightAlphaStep(NaN, 0.12, 0.1)).toBe(0);
    expect(spotlightAlphaStep(0.05, NaN, 0.1)).toBe(0);
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

describe("objectPrecession", () => {
  it("is 0 at the window edges (no fight with the dissolve envelope)", () => {
    expect(objectPrecession(0)).toBe(0);
    expect(objectPrecession(1)).toBeCloseTo(0, 10);
  });

  it("peaks at the window center", () => {
    expect(objectPrecession(0.5)).toBeCloseTo(0.35, 10);
  });

  it("rises monotonically from edge to center and is symmetric", () => {
    expect(objectPrecession(0.25)).toBeGreaterThan(objectPrecession(0.1));
    expect(objectPrecession(0.25)).toBeLessThan(objectPrecession(0.5));
    expect(objectPrecession(0.25)).toBeCloseTo(objectPrecession(0.75), 10);
  });

  it("clamps out-of-range window progress", () => {
    expect(objectPrecession(-0.5)).toBe(0);
    expect(objectPrecession(1.5)).toBeCloseTo(0, 10);
  });

  it("returns 0 for degenerate input", () => {
    expect(objectPrecession(NaN)).toBe(0);
    expect(objectPrecession(Infinity)).toBe(0);
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

describe("glanceYawOffset", () => {
  it("peaks at the amplitude at t=0", () => {
    expect(glanceYawOffset(0, 0.105)).toBe(0.105);
    expect(glanceYawOffset(0, GLANCE_AMP_RAD * GLANCE_DIR)).toBeCloseTo(
      -0.105,
      10,
    );
  });
  it("decays monotonically toward 0", () => {
    const a = glanceYawOffset(100, 0.105);
    const b = glanceYawOffset(500, 0.105);
    const c = glanceYawOffset(1000, 0.105);
    expect(a).toBeLessThan(0.105);
    expect(b).toBeLessThan(a);
    expect(c).toBeLessThan(b);
    expect(c).toBeGreaterThan(0);
    // e-folding check: value at one tau is amplitude/e
    expect(glanceYawOffset(GLANCE_TAU_MS, 0.105)).toBeCloseTo(
      0.105 / Math.E,
      10,
    );
  });
  it("is exactly 0 at and past the cutoff, and for degenerate input", () => {
    expect(glanceYawOffset(GLANCE_CUTOFF_MS, 0.105)).toBe(0);
    expect(glanceYawOffset(99999, 0.105)).toBe(0);
    expect(glanceYawOffset(-1, 0.105)).toBe(0);
    expect(glanceYawOffset(100, 0)).toBe(0);
  });
  it("preserves the sign of the amplitude", () => {
    expect(glanceYawOffset(200, -0.105)).toBeLessThan(0);
    expect(glanceYawOffset(200, 0.105)).toBeGreaterThan(0);
  });
  it("is ~1.2s to near-zero at the glance tau", () => {
    expect(Math.abs(glanceYawOffset(1200, GLANCE_AMP_RAD))).toBeLessThan(
      0.01,
    );
  });
});

describe("contactFaceRamp", () => {
  // contact is the last chapter (index 6 of 7); tops are document-relative.
  const vh = 800;
  const maxY = 6000;
  const tops = [0, 900, 1800, 2700, 3600, 4500, 5400];
  const start = 5400 - vh * 0.45; // the 45% activation line = 5040

  it("is exactly 0 before the contact window (chapters 0–5 untouched)", () => {
    expect(contactFaceRamp(0, tops, vh, maxY)).toBe(0);
    expect(contactFaceRamp(start - 1, tops, vh, maxY)).toBe(0);
    expect(contactFaceRamp(start, tops, vh, maxY)).toBe(0);
  });

  it("ramps 0 -> 1 monotonically across the contact window", () => {
    const mid = contactFaceRamp((start + maxY) / 2, tops, vh, maxY);
    expect(mid).toBeGreaterThan(0);
    expect(mid).toBeLessThan(1);
    expect(
      contactFaceRamp(start + (maxY - start) * 0.75, tops, vh, maxY),
    ).toBeGreaterThan(mid);
    expect(contactFaceRamp(maxY, tops, vh, maxY)).toBe(1);
    expect(contactFaceRamp(maxY + 500, tops, vh, maxY)).toBe(1);
  });

  it("cancels the scroll turn exactly at the bottom by construction", () => {
    // the bust composes -BUST_MAX_TURN * smoothstep01(p) * ramp;
    // smoothstep01(1) = 1 and ramp(maxY) = 1, so the composed turn is 0.
    expect(smoothstep01(1)).toBe(1);
    expect(contactFaceRamp(maxY, tops, vh, maxY)).toBe(1);
  });

  it("is 0 for degenerate input", () => {
    const missing = [...tops.slice(0, 6), Number.POSITIVE_INFINITY];
    expect(contactFaceRamp(5900, missing, vh, maxY)).toBe(0); // no contact section
    expect(contactFaceRamp(5900, tops, vh, 0)).toBe(0); // no scroll room
    expect(contactFaceRamp(5900, tops, 0, maxY)).toBe(0); // no viewport
    // window would be empty (activation line at/below the bottom)
    expect(contactFaceRamp(5900, tops, vh, 5000)).toBe(0);
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

describe("shouldFireKeyRipple", () => {
  it("fires on the first keystroke (never-fired -Infinity sentinel)", () => {
    expect(shouldFireKeyRipple(-Infinity, 1000)).toBe(true);
  });
  it("blocks keystrokes inside the interval", () => {
    expect(shouldFireKeyRipple(1000, 1100)).toBe(false);
    expect(shouldFireKeyRipple(1000, 1249)).toBe(false);
  });
  it("fires exactly at and after the interval", () => {
    expect(shouldFireKeyRipple(1000, 1250)).toBe(true);
    expect(shouldFireKeyRipple(1000, 5000)).toBe(true);
  });
  it("honors a custom interval", () => {
    expect(shouldFireKeyRipple(1000, 1049, 100)).toBe(false);
    expect(shouldFireKeyRipple(1000, 1100, 100)).toBe(true);
  });
  it("never fires on a degenerate nowMs, allows on a degenerate lastFireMs", () => {
    expect(shouldFireKeyRipple(1000, NaN)).toBe(false);
    expect(shouldFireKeyRipple(NaN, 1000)).toBe(true);
  });
});

describe("transmitBurstOrigin", () => {
  it("centers on the form rect", () => {
    expect(
      transmitBurstOrigin({ left: 100, top: 200, width: 400, height: 300 }, 1280, 800),
    ).toEqual({ ox: 300, oy: 350 });
  });
  it("falls back to viewport center on a missing rect", () => {
    expect(transmitBurstOrigin(null, 1280, 800)).toEqual({ ox: 640, oy: 400 });
  });
  it("falls back to viewport center on a degenerate rect", () => {
    expect(
      transmitBurstOrigin({ left: 0, top: 0, width: 0, height: 300 }, 1280, 800),
    ).toEqual({ ox: 640, oy: 400 });
    expect(
      transmitBurstOrigin({ left: NaN, top: 0, width: 100, height: 100 }, 1280, 800),
    ).toEqual({ ox: 640, oy: 400 });
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

describe("hash2", () => {
  it("is deterministic and in [0, 1)", () => {
    expect(hash2(3, 7)).toBe(hash2(3, 7));
    expect(hash2(0, 0)).toBeGreaterThanOrEqual(0);
    expect(hash2(0, 0)).toBeLessThan(1);
  });

  it("varies across inputs", () => {
    const vals = new Set([hash2(0, 0), hash2(1, 0), hash2(0, 1), hash2(5, 9), hash2(-3, 4)]);
    expect(vals.size).toBe(5);
  });
});

describe("valueNoise2", () => {
  it("is deterministic and in [0, 1)", () => {
    expect(valueNoise2(1.7, -3.2)).toBe(valueNoise2(1.7, -3.2));
    for (const [x, y] of [[0, 0], [10.5, -4.25], [100, 100], [-7.7, 3.3]] as const) {
      const v = valueNoise2(x, y);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it("interpolates smoothly between lattice points", () => {
    const a = valueNoise2(2.0, 2.0);
    const b = valueNoise2(2.5, 2.0);
    const c = valueNoise2(3.0, 2.0);
    // smoothstep interpolation: the midpoint sits strictly between its neighbors' range
    expect(Math.min(a, c) - 1e-9).toBeLessThanOrEqual(b);
    expect(b).toBeLessThanOrEqual(Math.max(a, c) + 1e-9);
  });
});

describe("fbm2", () => {
  it("is deterministic and in [0, 1)", () => {
    expect(fbm2(4.2, 9.9)).toBe(fbm2(4.2, 9.9));
    const v = fbm2(4.2, 9.9);
    expect(v).toBeGreaterThanOrEqual(0);
    expect(v).toBeLessThan(1);
  });

  it("with one octave equals value noise exactly", () => {
    expect(fbm2(4.2, 9.9, 1)).toBe(valueNoise2(4.2, 9.9));
  });

  it("with zero octaves returns 0 (no division by zero)", () => {
    expect(fbm2(4.2, 9.9, 0)).toBe(0);
  });
});

describe("chapterCrossingScrollY", () => {
  it("puts the crossing where the next section's top hits the 45% line", () => {
    expect(chapterCrossingScrollY(2000, 800)).toBe(2000 - 800 * 0.45);
    expect(chapterCrossingScrollY(360, 800)).toBe(0);
  });
});

describe("wipeRawFrac", () => {
  it("is 0 before the first crossing and 1 past the last", () => {
    expect(wipeRawFrac(100, Number.NEGATIVE_INFINITY, 1000)).toBe(0);
    expect(wipeRawFrac(5000, 1000, Number.POSITIVE_INFINITY)).toBe(1);
  });

  it("is linear across the interval and clamps", () => {
    expect(wipeRawFrac(1000, 1000, 2000)).toBe(0);
    expect(wipeRawFrac(1500, 1000, 2000)).toBeCloseTo(0.5, 10);
    expect(wipeRawFrac(2000, 1000, 2000)).toBe(1);
    expect(wipeRawFrac(500, 1000, 2000)).toBe(0);
    expect(wipeRawFrac(2500, 1000, 2000)).toBe(1);
  });

  it("handles a degenerate interval without NaN", () => {
    expect(wipeRawFrac(1000, 1000, 1000)).toBe(1);
    expect(wipeRawFrac(999, 1000, 1000)).toBe(0);
  });
});

describe("wipeSweepThreshold", () => {
  it("holds the outgoing dialect before the window and the incoming dialect after", () => {
    expect(wipeSweepThreshold(0)).toBe(0);
    expect(wipeSweepThreshold(0.29)).toBe(0);
    expect(wipeSweepThreshold(0.71)).toBe(1);
    expect(wipeSweepThreshold(1)).toBe(1);
  });

  it("sweeps through the middle of the interval, eased at both ends", () => {
    expect(wipeSweepThreshold(0.5)).toBeCloseTo(0.5, 10);
    const early = wipeSweepThreshold(0.35);
    const late = wipeSweepThreshold(0.65);
    expect(early).toBeGreaterThan(0);
    expect(early).toBeLessThan(0.5);
    expect(late).toBeGreaterThan(0.5);
    expect(late).toBeLessThan(1);
  });

  it("is monotonic", () => {
    let prev = -1;
    for (const r of [0, 0.2, 0.3, 0.5, 0.7, 0.8, 1]) {
      const t = wipeSweepThreshold(r);
      expect(t).toBeGreaterThanOrEqual(prev);
      prev = t;
    }
  });
});

describe("wipeGlyphChar", () => {
  const VOCAB = ["a", "b", "c", "d", "e", "f", "g", "h"];

  it("always picks a member of the vocabulary", () => {
    for (let gi = 0; gi < 40; gi++) {
      for (const incoming of [true, false]) {
        expect(VOCAB).toContain(wipeGlyphChar(VOCAB, gi, 3, incoming));
      }
    }
  });

  it("is stable per (glyph, crossing, side) — the wipe never boils", () => {
    expect(wipeGlyphChar(VOCAB, 7, 3, true)).toBe(wipeGlyphChar(VOCAB, 7, 3, true));
    expect(wipeGlyphChar(VOCAB, 7, 3, false)).toBe(wipeGlyphChar(VOCAB, 7, 3, false));
  });

  it("varies across glyphs and sides (not a constant pick)", () => {
    const picks = new Set<string>();
    for (let gi = 0; gi < 12; gi++) {
      picks.add(wipeGlyphChar(VOCAB, gi, 3, true));
      picks.add(wipeGlyphChar(VOCAB, gi, 3, false));
    }
    expect(picks.size).toBeGreaterThan(1);
  });
});

describe("bustRimLight", () => {
  it("is 1 at the bust center when the pointer is over the center", () => {
    expect(bustRimLight(0, 0, 0, 0)).toBe(1);
  });

  it("lights the pointer side and darkens the far side", () => {
    const lit = bustRimLight(1, 0, 0.9, 0);
    const dark = bustRimLight(1, 0, -0.9, 0);
    expect(lit).toBeGreaterThan(0.9);
    expect(dark).toBe(0);
  });

  it("is symmetric for the vertical axis", () => {
    expect(bustRimLight(0, -1, 0, -0.9)).toBeCloseTo(
      bustRimLight(0, 1, 0, 0.9),
      6,
    );
  });

  it("stays within 0..1 for extreme inputs", () => {
    for (const [lu, lv, pu, pv] of [
      [3, -2, 1, 1],
      [-3, 2, -1, -1],
      [0.001, 0.001, 0.001, 0.001],
    ]) {
      const r = bustRimLight(lu, lv, pu, pv);
      expect(r).toBeGreaterThanOrEqual(0);
      expect(r).toBeLessThanOrEqual(1);
    }
  });
});

describe("bustLightPresence", () => {
  it("is 1 at the bust center and 0 at three half-extents", () => {
    expect(bustLightPresence(0, 150)).toBe(1);
    expect(bustLightPresence(450, 150)).toBe(0);
    expect(bustLightPresence(900, 150)).toBe(0);
  });

  it("ramps linearly in between", () => {
    expect(bustLightPresence(225, 150)).toBeCloseTo(0.5, 6);
  });

  it("guards degenerate inputs", () => {
    expect(bustLightPresence(10, 0)).toBe(0);
    expect(bustLightPresence(-5, 150)).toBe(1);
  });
});

describe("bustRimShaped", () => {
  it("is 1 for a fully-lit point at full presence", () => {
    expect(bustRimShaped(1, 1)).toBe(1);
  });

  it("gates below the 0.2 rim threshold (only the clearly-lit side lifts)", () => {
    expect(bustRimShaped(0.19, 1)).toBe(0);
    expect(bustRimShaped(0, 1)).toBe(0);
  });

  it("ramps smoothly between the gate and full", () => {
    const mid = bustRimShaped(0.475, 1);
    expect(mid).toBeGreaterThan(0);
    expect(mid).toBeLessThan(1);
  });

  it("scales with the eased presence and is exactly 0 at rest", () => {
    expect(bustRimShaped(1, 0)).toBe(0);
    expect(bustRimShaped(1, 0.5)).toBeCloseTo(0.5, 6);
    expect(bustRimShaped(1, 2)).toBe(1); // presence clamped
  });
});

describe("bustWipeDepth", () => {
  it("is exactly 0 at rest (wipeThr 0 and 1) — the at-rest render gate", () => {
    expect(bustWipeDepth(0)).toBe(0);
    expect(bustWipeDepth(1)).toBe(0);
  });

  it("peaks mid-window at the cap and is triangular", () => {
    expect(bustWipeDepth(0.5)).toBe(BUST_WIPE_MAX_DROP);
    expect(bustWipeDepth(0.25)).toBeCloseTo(BUST_WIPE_MAX_DROP / 2, 10);
    expect(bustWipeDepth(0.75)).toBeCloseTo(BUST_WIPE_MAX_DROP / 2, 10);
  });

  it("clamps degenerate inputs", () => {
    expect(bustWipeDepth(-1)).toBe(0);
    expect(bustWipeDepth(2)).toBe(0);
  });
});

describe("bustWipeDrop", () => {
  it("never drops at rest — nothing under a 0 depth", () => {
    expect(bustWipeDrop(0, 0)).toBe(false);
    expect(bustWipeDrop(0.999, 1)).toBe(false);
  });

  it("drops points under the front mid-window (hard edge, not a fade)", () => {
    expect(bustWipeDrop(0.1, 0.5)).toBe(true);
    expect(bustWipeDrop(0.9, 0.5)).toBe(false);
  });
});

describe("bustGhostErase", () => {
  it("is exactly 0 at/below the deadband — the at-rest clearRect contract", () => {
    expect(bustGhostErase(0)).toBe(0);
    expect(bustGhostErase(BUST_GHOST_DEADBAND)).toBe(0);
    expect(bustGhostErase(BUST_GHOST_DEADBAND - 1e-4)).toBe(0);
  });

  it("never trails the perpetual idle sway (0.055 rad @ 0.3 rad/s = 0.0165 rad/s peak)", () => {
    expect(bustGhostErase(0.055 * 0.3)).toBe(0);
  });

  it("ramps linearly above the deadband and is monotonic", () => {
    const a = bustGhostErase(BUST_GHOST_DEADBAND + 0.1);
    const b = bustGhostErase(BUST_GHOST_DEADBAND + 0.2);
    expect(a).toBeCloseTo(BUST_GHOST_GAIN * 0.1, 10);
    expect(b).toBeGreaterThan(a);
    expect(b).toBeCloseTo(BUST_GHOST_GAIN * 0.2, 10);
  });

  it("caps the erase — no full-wipe frames on violent flings", () => {
    expect(bustGhostErase(10)).toBe(BUST_GHOST_ERASE_CAP);
  });

  it("treats degenerate inputs as rest", () => {
    expect(bustGhostErase(-1)).toBe(0);
    expect(bustGhostErase(Number.NaN)).toBe(0);
    expect(bustGhostErase(Number.POSITIVE_INFINITY)).toBe(0);
  });
});

describe("objectGhostErase", () => {
  it("is exactly 0 at/below the deadband — the at-rest clearRect contract", () => {
    expect(objectGhostErase(0)).toBe(0);
    expect(objectGhostErase(OBJECT_GHOST_DEADBAND)).toBe(0);
    expect(objectGhostErase(OBJECT_GHOST_DEADBAND - 1e-4)).toBe(0);
  });

  it("never trails the base time-only rotation (fastest base rate 0.2 rad/s)", () => {
    expect(objectGhostErase(0.11)).toBe(0);
    expect(objectGhostErase(0.15)).toBe(0);
    expect(objectGhostErase(0.2)).toBe(0);
  });

  it("ramps linearly above the deadband and is monotonic", () => {
    const a = objectGhostErase(OBJECT_GHOST_DEADBAND + 0.5);
    const b = objectGhostErase(OBJECT_GHOST_DEADBAND + 1.0);
    expect(a).toBeCloseTo(OBJECT_GHOST_GAIN * 0.5, 10);
    expect(b).toBeGreaterThan(a);
    expect(b).toBeCloseTo(OBJECT_GHOST_GAIN * 1.0, 10);
  });

  it("gives a ~4-frame decay at a typical fling velocity, not a wipe", () => {
    // 2.6 rad/s fling -> erase ~0.44, so each moving tick retains ~0.56
    expect(objectGhostErase(2.6)).toBeCloseTo(0.44, 10);
    expect(objectGhostErase(2.6)).toBeLessThan(OBJECT_GHOST_ERASE_CAP);
  });

  it("caps the erase — no full-wipe frames on violent flings", () => {
    expect(objectGhostErase(10)).toBe(OBJECT_GHOST_ERASE_CAP);
  });

  it("treats degenerate inputs as rest", () => {
    expect(objectGhostErase(-1)).toBe(0);
    expect(objectGhostErase(Number.NaN)).toBe(0);
    expect(objectGhostErase(Number.POSITIVE_INFINITY)).toBe(0);
  });
});

describe("shapeGlyphForTangent", () => {
  it("maps the four cardinal/diagonal tangents (screen space, y down)", () => {
    expect(shapeGlyphForTangent(1, 0)).toBe("-");
    expect(shapeGlyphForTangent(0, 1)).toBe("|");
    expect(shapeGlyphForTangent(1, 1)).toBe("\\");
    expect(shapeGlyphForTangent(1, -1)).toBe("/");
  });

  it("is unoriented — a line has no arrow", () => {
    expect(shapeGlyphForTangent(-1, 0)).toBe("-");
    expect(shapeGlyphForTangent(0, -1)).toBe("|");
    expect(shapeGlyphForTangent(-1, -1)).toBe("\\");
    expect(shapeGlyphForTangent(-1, 1)).toBe("/");
  });

  it("quantizes near-misses to the nearest direction", () => {
    expect(shapeGlyphForTangent(2, 0.1)).toBe("-");
    expect(shapeGlyphForTangent(0.1, 2)).toBe("|");
  });
});

describe("boundaryShapeGlyph", () => {
  // 5x5 grid, 3x3 filled block centered at (1..3, 1..3).
  const cols = 5, rows = 5;
  const occ = new Uint8Array(cols * rows);
  for (let r = 1; r <= 3; r++) for (let c = 1; c <= 3; c++) occ[r * cols + c] = 1;

  it("returns null for interior cells", () => {
    expect(boundaryShapeGlyph(occ, cols, rows, 2, 2)).toBeNull();
  });

  it("follows the edge: top edge is horizontal, left edge vertical", () => {
    expect(boundaryShapeGlyph(occ, cols, rows, 2, 1)).toBe("-");
    expect(boundaryShapeGlyph(occ, cols, rows, 1, 2)).toBe("|");
  });

  it("resolves corners to the diagonal", () => {
    expect(boundaryShapeGlyph(occ, cols, rows, 1, 1)).toBe("/");
    expect(boundaryShapeGlyph(occ, cols, rows, 3, 3)).toBe("/");
  });

  it("treats out-of-grid as filled — the tile edge never triggers", () => {
    const tiny = new Uint8Array([1]);
    expect(boundaryShapeGlyph(tiny, 1, 1, 0, 0)).toBeNull();
  });
});

describe("computeScrollSnapshot", () => {
  const tops = [0, 1000, 2000, 3000, 4000, 5000, 6000];
  const vh = 800;
  const docH = 6800; // max scroll = 6000

  it("publishes maxY (docHeight - vh) for window-space ramps", () => {
    expect(computeScrollSnapshot(0, docH, vh, tops, 0, 0, 0).maxY).toBe(6000);
    expect(computeScrollSnapshot(3000, docH, vh, tops, 0, 0, 0).maxY).toBe(
      6000,
    );
  });

  it("reports progress 0 at the top, 1 at the bottom, clamped past the end", () => {
    expect(computeScrollSnapshot(0, docH, vh, tops, 0, 0, 0).progress).toBe(0);
    expect(
      computeScrollSnapshot(3000, docH, vh, tops, 0, 0, 0).progress,
    ).toBeCloseTo(0.5, 5);
    expect(computeScrollSnapshot(6000, docH, vh, tops, 0, 0, 0).progress).toBe(
      1,
    );
    expect(computeScrollSnapshot(9999, docH, vh, tops, 0, 0, 0).progress).toBe(
      1,
    );
  });

  it("reports progress 0 when the document fits in the viewport", () => {
    expect(computeScrollSnapshot(0, 700, vh, tops, 0, 0, 0).progress).toBe(0);
  });

  it("derives signed velocity with the warp low-pass on the first moving frame", () => {
    // dt = 1/60: factor = 1 - 0.88^1 = 0.12; raw = 100 / (1/60) = 6000.
    const down = computeScrollSnapshot(100, docH, vh, tops, 1 / 60, 0, 0);
    expect(down.velocity).toBeCloseTo(720, 5);
    expect(down.y).toBe(100);
    // Scrolling up is negative — the marquee needs the sign for its skew.
    const up = computeScrollSnapshot(0, docH, vh, tops, 1 / 60, 100, 0);
    expect(up.velocity).toBeCloseTo(-720, 5);
  });

  it("decays velocity toward 0 while settled and holds 0 at rest", () => {
    const settled = computeScrollSnapshot(100, docH, vh, tops, 1 / 60, 100, 720);
    expect(settled.velocity).toBeCloseTo(720 * 0.88, 5);
    const rest = computeScrollSnapshot(100, docH, vh, tops, 1 / 60, 100, 0);
    expect(rest.velocity).toBe(0);
  });

  it("ignores the frame delta on the seed call (dt = 0)", () => {
    const seed = computeScrollSnapshot(2500, docH, vh, tops, 0, 0, 999);
    expect(seed.velocity).toBe(999); // degenerate: no new information
    expect(seed.y).toBe(2500);
    expect(seed.progress).toBeCloseTo(2500 / 6000, 5);
  });

  it("tab-return reseed zeroes velocity exactly (pause/resume contract)", () => {
    // The seed above preserves prevVel, so the visibility-resume path
    // must zero prevVel and track prevY to the current scroll position
    // FIRST — that combination yields exactly 0, never a decayed fling.
    const resumed = computeScrollSnapshot(2500, docH, vh, tops, 0, 2500, 0);
    expect(resumed.velocity).toBe(0);
    expect(resumed.y).toBe(2500);
  });

  it("a clamped resume frame alone does NOT clear a mid-fling velocity", () => {
    // The pre-fix hazard the reseed exists for: tab return resumed
    // with dt clamped to 0.1s over the stale fling velocity, so one
    // frame leaves 0.88^6 (~46%) alive — enough to trip warp / chroma /
    // storm with zero user input.
    const resumed = computeScrollSnapshot(2500, docH, vh, tops, 0.1, 2500, 2000);
    expect(resumed.velocity).toBeCloseTo(2000 * Math.pow(0.88, 6), 5);
    expect(resumed.velocity).toBeGreaterThan(0);
  });

  it("resolves chapters with the shared 45%-activation-line rule", () => {
    // activation line = 800 * 0.45 = 360.
    expect(computeScrollSnapshot(0, docH, vh, tops, 0, 0, 0).chapterIndex).toBe(
      0,
    );
    // y=700: viewport tops [-700, 300, 1300, ...] — last at/below 360 is index 1.
    expect(
      computeScrollSnapshot(700, docH, vh, tops, 0, 0, 0).chapterIndex,
    ).toBe(1);
    expect(
      computeScrollSnapshot(1700, docH, vh, tops, 0, 0, 0).chapterIndex,
    ).toBe(2);
  });

  it("never activates a missing section (+Infinity top)", () => {
    const sparse = [0, Number.POSITIVE_INFINITY, 2000, 3000, 4000, 5000, 6000];
    // y=1700: viewport tops [-1700, +Inf, 300, ...] — index 1 is skipped,
    // index 2 (300 <= 360) activates.
    expect(
      computeScrollSnapshot(1700, docH, vh, sparse, 0, 0, 0).chapterIndex,
    ).toBe(2);
    // y=700: viewport tops [-700, +Inf, 1300, ...] — the gap resolves to 0.
    expect(
      computeScrollSnapshot(700, docH, vh, sparse, 0, 0, 0).chapterIndex,
    ).toBe(0);
  });

  it("passes tops through as a copy and carries the viewport height", () => {
    const snap = computeScrollSnapshot(0, docH, vh, tops, 0, 0, 0);
    expect(snap.tops).toEqual(tops);
    expect(snap.tops).not.toBe(tops);
    expect(snap.vh).toBe(vh);
  });
});

describe("objectWindowPos", () => {
  const w = OBJECT_WINDOWS[0]; // torus: a 0.02, b 0.48

  it("is 0 below the window and 1 above it, clamped", () => {
    expect(objectWindowPos(0, w)).toBe(0);
    expect(objectWindowPos(0.01, w)).toBe(0);
    expect(objectWindowPos(0.6, w)).toBe(1);
    expect(objectWindowPos(2, w)).toBe(1);
  });

  it("is exactly 0.5 at the window midpoint (smoothstep(0.5) = 0.5)", () => {
    expect(objectWindowPos((w.a + w.b) / 2, w)).toBeCloseTo(0.5, 10);
  });

  it("is monotonic across the window", () => {
    let prev = -1;
    for (let i = 0; i <= 20; i++) {
      const t = objectWindowPos(w.a + ((w.b - w.a) * i) / 20, w);
      expect(t).toBeGreaterThanOrEqual(prev);
      prev = t;
    }
  });

  it("agrees with the field's windowT on all three windows", () => {
    // Duplicated here (not imported) so the bust and the field can never
    // silently disagree on where an object is in its window.
    const windowT = (p: number, a: number, b: number) => {
      const t = Math.min(1, Math.max(0, (p - a) / (b - a)));
      return t * t * (3 - 2 * t);
    };
    for (const win of OBJECT_WINDOWS) {
      for (const p of [0, 0.1, 0.25, 0.5, 0.75, 0.9, 1]) {
        expect(objectWindowPos(p, win)).toBeCloseTo(
          windowT(p, win.a, win.b),
          10,
        );
      }
    }
  });
});

describe("objectWindowCrossed", () => {
  it("fires on a rising crossing of the 50% line", () => {
    expect(objectWindowCrossed(0.49, 0.51)).toBe(true);
  });

  it("fires on a falling crossing of the 50% line", () => {
    expect(objectWindowCrossed(0.51, 0.49)).toBe(true);
  });

  it("does not fire when both samples sit on the same side", () => {
    expect(objectWindowCrossed(0.1, 0.2)).toBe(false);
    expect(objectWindowCrossed(0.9, 0.8)).toBe(false);
  });

  it("does not fire when a sample sits exactly on the line", () => {
    expect(objectWindowCrossed(0.5, 0.6)).toBe(false);
    expect(objectWindowCrossed(0.4, 0.5)).toBe(false);
    expect(objectWindowCrossed(0.5, 0.5)).toBe(false);
  });
});

describe("objectGlanceDir", () => {
  it("returns a unit vector toward the object", () => {
    const d = objectGlanceDir(0.8375, 0.7, 0.84, 0.5); // torus below the bust
    expect(Math.hypot(d.x, d.y)).toBeCloseTo(1, 10);
    expect(d.y).toBeGreaterThan(0); // below = nod down (positive pitch)
    expect(d.x).toBeLessThan(0); // marginally left of the bust
  });

  it("points up-right for the sphere", () => {
    const d = objectGlanceDir(0.88, 0.26, 0.84, 0.5);
    expect(d.x).toBeGreaterThan(0);
    expect(d.y).toBeLessThan(0);
  });

  it("is axis-aligned directly below", () => {
    const d = objectGlanceDir(0.5, 0.8, 0.5, 0.5);
    expect(d.x).toBeCloseTo(0, 10);
    expect(d.y).toBeCloseTo(1, 10);
  });

  it("returns exactly {0,0} for the degenerate on-center case", () => {
    expect(objectGlanceDir(0.5, 0.5, 0.5, 0.5)).toEqual({ x: 0, y: 0 });
  });
});

describe("answerSpinEnvelope", () => {
  it("is 1 at t=0 (the answer starts at full spin)", () => {
    expect(answerSpinEnvelope(0)).toBe(1);
  });

  it("decays monotonically toward the cutoff", () => {
    let prev = answerSpinEnvelope(0);
    for (let t = 0.1; t < ANSWER_SPIN_CUTOFF_S; t += 0.1) {
      const v = answerSpinEnvelope(t);
      expect(v).toBeLessThanOrEqual(prev);
      prev = v;
    }
  });

  it("is exactly 0 at/past the cutoff (the at-rest contract)", () => {
    expect(answerSpinEnvelope(ANSWER_SPIN_CUTOFF_S)).toBe(0);
    expect(answerSpinEnvelope(ANSWER_SPIN_CUTOFF_S + 10)).toBe(0);
  });

  it("returns 0 for degenerate input", () => {
    expect(answerSpinEnvelope(-1)).toBe(0);
    expect(answerSpinEnvelope(NaN)).toBe(0);
    expect(answerSpinEnvelope(Infinity)).toBe(0);
  });

  it("integrates to a visible flick-spin, not a blur", () => {
    // ∫0^∞ rate·e^(-t/tau) dt = rate·tau; the cutoff at 4τ trims <2%.
    const gain = ANSWER_SPIN_RATE * ANSWER_SPIN_TAU_S;
    expect(gain).toBeGreaterThan(1); // >1 rad ≈ 57°: clearly visible
    expect(gain).toBeLessThan(1.5); // <1.5 rad: a flick, not a blur
  });
});

describe("attentionStep / attentionTargetYaw", () => {
  const NOW = 100_000;
  const IDLE_LAST_MOVE = NOW - 10_000; // pointer idle far past the gate
  const step = (
    prev: AttentionState,
    vel: number,
    nowMs = NOW,
    lastMoveMs = IDLE_LAST_MOVE,
  ) => attentionStep(prev, vel, nowMs, lastMoveMs);
  const engage = (): AttentionState => {
    let s: AttentionState = ATTENTION_REST;
    for (let i = 0; i < ATTENTION_SETTLE_TICKS; i++) s = step(s, 0);
    return s;
  };

  it("stays disengaged while scrolling", () => {
    const s = step(ATTENTION_REST, 500);
    expect(s.engagedAt).toBe(Number.NEGATIVE_INFINITY);
    expect(s.settledTicks).toBe(0);
  });

  it("engages after ATTENTION_SETTLE_TICKS settled idle ticks", () => {
    let s: AttentionState = ATTENTION_REST;
    for (let i = 0; i < ATTENTION_SETTLE_TICKS - 1; i++) s = step(s, 0);
    expect(s.engagedAt).toBe(Number.NEGATIVE_INFINITY);
    s = step(s, 0);
    expect(s.engagedAt).toBe(NOW);
  });

  it("does not engage while the pointer is active", () => {
    let s: AttentionState = ATTENTION_REST;
    for (let i = 0; i < ATTENTION_SETTLE_TICKS; i++)
      s = step(s, 0, NOW, NOW - ATTENTION_IDLE_MS + 1);
    expect(s.engagedAt).toBe(Number.NEGATIVE_INFINITY);
  });

  it("engages at exactly the idle boundary", () => {
    let s: AttentionState = ATTENTION_REST;
    for (let i = 0; i < ATTENTION_SETTLE_TICKS; i++)
      s = step(s, 0, NOW, NOW - ATTENTION_IDLE_MS);
    expect(s.engagedAt).toBe(NOW);
  });

  it("treats sub-deadband velocity as settled, deadband as movement", () => {
    let s: AttentionState = ATTENTION_REST;
    for (let i = 0; i < ATTENTION_SETTLE_TICKS; i++)
      s = step(s, ATTENTION_VEL_DEADBAND - 0.001);
    expect(s.engagedAt).toBe(NOW);
    const released = step(s, ATTENTION_VEL_DEADBAND);
    expect(released.engagedAt).toBe(Number.NEGATIVE_INFINITY);
    expect(released.settledTicks).toBe(0);
  });

  it("releases on scroll movement", () => {
    const s = step(engage(), 500);
    expect(s.engagedAt).toBe(Number.NEGATIVE_INFINITY);
    expect(s.settledTicks).toBe(0);
  });

  it("releases on pointer activity", () => {
    const s = step(engage(), 0, NOW + 1000, NOW + 1000);
    expect(s.engagedAt).toBe(Number.NEGATIVE_INFINITY);
    expect(s.settledTicks).toBe(0);
  });

  it("anti-stare releases at ATTENTION_STARE_MS and requires a fresh settle", () => {
    const engaged = engage();
    const released = step(engaged, 0, NOW + ATTENTION_STARE_MS);
    expect(released.engagedAt).toBe(Number.NEGATIVE_INFINITY);
    expect(released.settledTicks).toBe(0);
    // One settled tick after release is not enough to re-engage.
    const once = step(released, 0, NOW + ATTENTION_STARE_MS + 100);
    expect(once.engagedAt).toBe(Number.NEGATIVE_INFINITY);
    expect(once.settledTicks).toBe(1);
  });

  it("treats lastMoveMs = -Infinity as idle (the never-moved sentinel), not degenerate", () => {
    // Regression: the first guard rejected -Infinity outright, so the
    // bust — whose lastMoveT starts at -Infinity exactly like the
    // glance's — could never engage in-situ.
    let s: AttentionState = ATTENTION_REST;
    for (let i = 0; i < ATTENTION_SETTLE_TICKS; i++)
      s = attentionStep(s, 0, NOW, Number.NEGATIVE_INFINITY);
    expect(s.engagedAt).toBe(NOW);
    expect(attentionTargetYaw(s)).toBeLessThan(0);
  });

  it("degenerate input fails disengaged", () => {
    expect(step(ATTENTION_REST, NaN).engagedAt).toBe(
      Number.NEGATIVE_INFINITY,
    );
    expect(
      attentionStep(engage(), 0, NaN, IDLE_LAST_MOVE).engagedAt,
    ).toBe(Number.NEGATIVE_INFINITY);
    expect(
      attentionStep(engage(), 0, NOW, NaN).engagedAt,
    ).toBe(Number.NEGATIVE_INFINITY);
  });

  it("target yaw is a derived fraction of the glance amplitude, 0 when disengaged", () => {
    expect(attentionTargetYaw(ATTENTION_REST)).toBe(0);
    const target = attentionTargetYaw(engage());
    expect(target).toBeCloseTo(ATTENTION_FRAC * GLANCE_AMP_RAD * GLANCE_DIR, 12);
    expect(target).toBeLessThan(0); // toward the content column (GLANCE_DIR = -1)
    expect(Math.abs(target)).toBeLessThan(GLANCE_AMP_RAD); // a whisper of the glance
  });
});

describe("answerWireEnvelope", () => {
  it("starts at 0, rises fast, then decays (a flash, not a step)", () => {
    expect(answerWireEnvelope(0)).toBe(0);
    const peak = answerWireEnvelope(ANSWER_WIRE_RISE_S);
    expect(peak).toBeGreaterThan(0.5);
    expect(answerWireEnvelope(ANSWER_WIRE_TAU_S * 3)).toBeLessThan(peak * 0.1);
  });

  it("is exactly 0 at/past the cutoff", () => {
    expect(answerWireEnvelope(ANSWER_WIRE_CUTOFF_S)).toBe(0);
    expect(answerWireEnvelope(ANSWER_WIRE_CUTOFF_S + 10)).toBe(0);
  });

  it("returns 0 for degenerate input", () => {
    expect(answerWireEnvelope(-1)).toBe(0);
    expect(answerWireEnvelope(NaN)).toBe(0);
    expect(answerWireEnvelope(Infinity)).toBe(0);
  });

  it("finishes well before the spin settles (call-and-response, not one smear)", () => {
    expect(ANSWER_WIRE_CUTOFF_S).toBeLessThan(ANSWER_SPIN_CUTOFF_S);
  });
});

describe("dominantObject", () => {
  it("is -1 when nothing is drawn", () => {
    expect(dominantObject([])).toBe(-1);
    expect(dominantObject([0, 0, 0])).toBe(-1);
    expect(dominantObject([0.01, 0.01, 0.01])).toBe(-1); // at the gate, not above it
    expect(dominantObject([NaN, NaN])).toBe(-1);
  });

  it("returns the loudest window and keeps ties on the earlier object", () => {
    expect(dominantObject([0.3, 0.9, 0.5])).toBe(1);
    expect(dominantObject([0.9, 0.9, 0.2])).toBe(0);
    expect(dominantObject([0.011])).toBe(0);
  });
});

describe("constellationEnvelope", () => {
  it("starts at 1 and decays exponentially", () => {
    expect(constellationEnvelope(0)).toBe(1);
    expect(constellationEnvelope(CONSTELLATION_TAU_S)).toBeCloseTo(1 / Math.E, 10);
  });

  it("is exactly 0 at/past the cutoff and for degenerate input", () => {
    expect(constellationEnvelope(CONSTELLATION_CUTOFF_S)).toBe(0);
    expect(constellationEnvelope(CONSTELLATION_CUTOFF_S + 10)).toBe(0);
    expect(constellationEnvelope(-1)).toBe(0);
    expect(constellationEnvelope(NaN)).toBe(0);
    expect(constellationEnvelope(Infinity)).toBe(0);
  });
});

describe("constellationSegment", () => {
  it("joins the two objects' mid-window anchors", () => {
    const seg = constellationSegment(0, 1);
    expect(seg).toEqual({
      x0: OBJECT_WINDOWS[0].mx,
      y0: OBJECT_WINDOWS[0].my,
      x1: OBJECT_WINDOWS[1].mx,
      y1: OBJECT_WINDOWS[1].my,
    });
    expect(seg!.x0).toBeGreaterThan(0.8); // right rail, never the reading column
    expect(seg!.x1).toBeGreaterThan(0.8);
  });

  it("is null for degenerate pairs", () => {
    expect(constellationSegment(1, 1)).toBeNull();
    expect(constellationSegment(-1, 1)).toBeNull();
    expect(constellationSegment(0, 3)).toBeNull();
    expect(constellationSegment(NaN, 1)).toBeNull();
  });

  it("is a whisper, not a beam", () => {
    expect(CONSTELLATION_ALPHA_MAX).toBeLessThanOrEqual(0.25);
  });
});
