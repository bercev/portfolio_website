import * as THREE from "three";
import { describe, expect, it, vi } from "vitest";

import {
  gradientColorHex,
  normalizeLuminances,
  letterBoundsFromOrigins,
  normalizeParticleColor,
  sampleImagePoints,
  swayYaw,
} from "./particle-text-scene";

describe("Particle Text colors", () => {
  it("normalizes CSS Color 4 sRGB values before Three.js parses them", () => {
    const warning = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const color = new THREE.Color(
      normalizeParticleColor("color(srgb 0.0847059 0.526275 0.355294)"),
    );

    expect(warning).not.toHaveBeenCalled();
    expect(color.getHexString()).toBe("16865b");
    warning.mockRestore();
  });
});

describe("letterBoundsFromOrigins", () => {
  it("converts centered, y-up origins to canvas-pixel bounds", () => {
    // Two points: (-100, 50, z) and (200, -30, z) on a 1000×400 canvas.
    const origins = new Float32Array([-100, 50, 0, 200, -30, 0]);
    expect(letterBoundsFromOrigins(origins, 1000, 400)).toEqual({
      left: 400,
      top: 150,
      right: 700,
      bottom: 230,
    });
  });

  it("ignores the depth channel", () => {
    const origins = new Float32Array([0, 0, 999, 10, 10, -999]);
    expect(letterBoundsFromOrigins(origins, 100, 100)).toEqual({
      left: 50,
      top: 40,
      right: 60,
      bottom: 50,
    });
  });

  it("returns null for an empty origin list", () => {
    expect(letterBoundsFromOrigins(new Float32Array(), 100, 100)).toBeNull();
  });
});

describe("sampleImagePoints", () => {
  // 4x2 RGBA image, red channel carries the luminance: row 0 is
  // [0, 128, 255, 64], row 1 is [255, 0, 128, 255]. Gap 1, threshold 0.05.
  function imageData(): Uint8ClampedArray {
    const lums = [0, 128, 255, 64, 255, 0, 128, 255];
    const data = new Uint8ClampedArray(4 * 2 * 4);
    lums.forEach((lum, i) => {
      data[i * 4] = lum;
      data[i * 4 + 3] = 255;
    });
    return data;
  }

  it("skips crushed-background pixels and centers y-up origins", () => {
    const { origins, luminances } = sampleImagePoints(imageData(), 4, 2, 1);
    // Kept: (1,0) lum 128, (2,0) lum 255, (3,0) lum 64, (0,1) lum 255,
    // (2,1) lum 128, (3,1) lum 255 — 6 points.
    expect(origins.length).toBe(18);
    expect(luminances.length).toBe(6);
    // Float32 storage rounds the quotients — compare with tolerance.
    const expected = [128 / 255, 1, 64 / 255, 1, 128 / 255, 1];
    Array.from(luminances).forEach((lum, i) => {
      expect(lum).toBeCloseTo(expected[i], 5);
    });
    // First point (x=1, y=0) on a 4x2 canvas: centered (1-2, 1-0) = (-1, 1).
    expect(origins[0]).toBe(-1);
    expect(origins[1]).toBe(1);
    // Depth is the luminance relief: (lum - 0.5) * depthScale.
    expect(origins[2]).toBeCloseTo((128 / 255 - 0.5) * 48, 5);
    // Last point (x=3, y=1): (1, 0) centered.
    expect(origins[15]).toBe(1);
    expect(origins[16]).toBe(0);
  });

  it("honors the gap and returns empty when nothing clears the threshold", () => {
    const { origins } = sampleImagePoints(imageData(), 4, 2, 1, 1.0);
    expect(origins.length).toBe(0);
    const sparse = sampleImagePoints(imageData(), 4, 2, 2);
    // Gap 2 samples x in {0, 2}, y in {0} only: (0,0) is crushed, (2,0) lum 1.
    expect(sparse.luminances.length).toBe(1);
    expect(sparse.luminances[0]).toBe(1);
  });
});

describe("gradientColorHex", () => {
  it("returns the exact stops at the ends and lerps between them", () => {
    expect(gradientColorHex(["#000000", "#ffffff"], 0)).toBe("#000000");
    expect(gradientColorHex(["#000000", "#ffffff"], 1)).toBe("#ffffff");
    expect(gradientColorHex(["#000000", "#ffffff"], 0.5)).toBe("#808080");
    expect(gradientColorHex(["#0284c7", "#7dd3fc"], 0.5)).toBe("#40ace2");
    // Multi-stop: t=0.5 lands exactly on the middle stop.
    expect(
      gradientColorHex(["#000000", "#808080", "#ffffff"], 0.5),
    ).toBe("#808080");
    expect(
      gradientColorHex(["#000000", "#808080", "#ffffff"], 0.25),
    ).toBe("#404040");
  });

  it("clamps t outside [0, 1]", () => {
    expect(gradientColorHex(["#000000", "#ffffff"], -1)).toBe("#000000");
    expect(gradientColorHex(["#000000", "#ffffff"], 2)).toBe("#ffffff");
  });
});

describe("swayYaw", () => {
  it("is zero at t=0 and peaks at a quarter period", () => {
    expect(swayYaw(0)).toBe(0);
    expect(swayYaw(Math.PI / 2 / 0.00025)).toBeCloseTo(0.05, 10);
    expect(swayYaw(Math.PI / 0.00025)).toBeCloseTo(0, 10);
  });
});

describe("normalizeLuminances", () => {
  it("stretches the observed range to [0, 1]", () => {
    const out = normalizeLuminances(
      new Float32Array([0.4, 0.5, 0.7, 1.0, 0.4]),
    );
    // Float32 storage rounds the quotients — compare with tolerance.
    const expected = [0, 1 / 6, 0.5, 1, 0];
    Array.from(out).forEach((v, i) => expect(v).toBeCloseTo(expected[i], 5));
  });

  it("is the identity on flat or empty input", () => {
    const flat = new Float32Array([0.5, 0.5]);
    expect(normalizeLuminances(flat)).toBe(flat);
    expect(normalizeLuminances(new Float32Array()).length).toBe(0);
  });
});

