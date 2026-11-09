import * as THREE from "three";
import { describe, expect, it, vi } from "vitest";

import { letterBoundsFromOrigins, normalizeParticleColor } from "./particle-text-scene";

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
