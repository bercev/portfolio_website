import { describe, expect, it } from "vitest";

import {
  LIQUID_BLOB_LAYOUT_ID,
  LIQUID_BLOB_RADII,
  LIQUID_BLOB_SPRING,
  LIQUID_SCALE,
  LIQUID_SCALE_SPRING,
  LIQUID_TAP_PULSE_MS,
  LIQUID_WOBBLE_S,
  isLiquidBlobRadius,
  liquidBlobRadiusAt,
} from "./project-liquid";

describe("LIQUID_BLOB_RADII", () => {
  it("holds well-formed elliptical blob radii", () => {
    expect(LIQUID_BLOB_RADII.length).toBeGreaterThanOrEqual(3);
    for (const radius of LIQUID_BLOB_RADII) {
      expect(isLiquidBlobRadius(radius)).toBe(true);
    }
  });

  it("wobbles: no two consecutive shapes share a corner value", () => {
    const corners = LIQUID_BLOB_RADII.map((radius) =>
      radius.replace(" / ", " ").split(" ").map((part) => Number(part.replace("%", ""))),
    );
    for (let i = 0; i < corners.length; i++) {
      const a = corners[i] as number[];
      const b = corners[(i + 1) % corners.length] as number[];
      expect(a).not.toEqual(b);
    }
  });

  it("rejects malformed radii", () => {
    expect(isLiquidBlobRadius("0px")).toBe(false);
    expect(isLiquidBlobRadius("50% 50%")).toBe(false);
    expect(isLiquidBlobRadius("150% 50% 50% 50% / 50% 50% 50% 50%")).toBe(
      false,
    );
  });
});

describe("liquidBlobRadiusAt", () => {
  it("cycles through the keyframes, wrapping around", () => {
    expect(liquidBlobRadiusAt(0)).toBe(LIQUID_BLOB_RADII[0]);
    expect(liquidBlobRadiusAt(LIQUID_BLOB_RADII.length)).toBe(
      LIQUID_BLOB_RADII[0],
    );
    expect(liquidBlobRadiusAt(-1)).toBe(
      LIQUID_BLOB_RADII[LIQUID_BLOB_RADII.length - 1],
    );
  });
});

describe("liquid constants", () => {
  it("names one shared blob layout id", () => {
    expect(LIQUID_BLOB_LAYOUT_ID).toBe("project-liquid-blob");
  });

  it("holds a visible tap pulse and wobble", () => {
    expect(LIQUID_TAP_PULSE_MS).toBe(1000);
    expect(LIQUID_WOBBLE_S).toBe(2.4);
  });

  it("springs are under-damped, so the morph overshoots and settles", () => {
    expect(LIQUID_SCALE).toBeGreaterThan(1);
    expect(LIQUID_SCALE_SPRING.type).toBe("spring");
    expect(LIQUID_SCALE_SPRING.damping).toBeLessThan(
      2 * Math.sqrt(LIQUID_SCALE_SPRING.stiffness),
    );
    expect(LIQUID_BLOB_SPRING.type).toBe("spring");
    expect(LIQUID_BLOB_SPRING.damping).toBeLessThan(
      2 * Math.sqrt(LIQUID_BLOB_SPRING.stiffness),
    );
  });
});
