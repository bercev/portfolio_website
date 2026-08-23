import * as THREE from "three";
import { describe, expect, it, vi } from "vitest";

import { normalizeParticleColor } from "./particle-text-scene";

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
