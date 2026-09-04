import { describe, expect, it } from "vitest";

import {
  CLICK_SPARK_DEFAULTS,
  calculateCanvasSize,
  calculateSparkSegment,
  getClickSparkColor,
  resolveSparkBurst,
} from "./click-spark";

describe("ClickSpark defaults", () => {
  it("uses the light theme spark color as its fallback", () => {
    expect(CLICK_SPARK_DEFAULTS).toEqual({
      sparkColor: "#000000",
      sparkSize: 10,
      sparkRadius: 20,
      sparkCount: 7,
      duration: 600,
    });
  });

  it("uses the palette accent before the display-mode color", () => {
    expect(getClickSparkColor("#f43f5e", "dark")).toBe("#f43f5e");
  });

  it("uses black sparks in base light mode and white sparks in base dark mode", () => {
    expect(getClickSparkColor(undefined, "light")).toBe("#000000");
    expect(getClickSparkColor(undefined, "dark")).toBe("#ffffff");
  });

  it("moves each spark outward while shrinking its line", () => {
    expect(
      calculateSparkSegment({
        x: 100,
        y: 80,
        angle: 0,
        progress: 0.5,
        sparkSize: 10,
        sparkRadius: 20,
      }),
    ).toEqual({
      startX: 115,
      startY: 80,
      endX: 117.5,
      endY: 80,
    });
  });

  it("keeps the canvas aligned to the viewport on Retina displays", () => {
    expect(
      calculateCanvasSize({ width: 1280, height: 800, pixelRatio: 2 }),
    ).toEqual({
      pixelWidth: 2560,
      pixelHeight: 1600,
      cssWidth: "1280px",
      cssHeight: "800px",
      scale: 2,
    });
  });

  it("uses peel/edge-flash angles on Vitae artifact grabs (not radial confetti)", () => {
    const richer = resolveSparkBurst({
      sparkCount: 7,
      sparkRadius: 20,
      richer: true,
    });
    expect(richer.sparkCount).toBe(8);
    expect(richer.sparkRadius).toBe(24);
    expect(richer.angles).toHaveLength(8);
    // Cardinal-biased: each spark near a page edge (N/E/S/W).
    for (let index = 0; index < richer.angles!.length; index += 1) {
      const edge = (index % 4) * (Math.PI / 2);
      expect(Math.abs(richer.angles![index]! - edge)).toBeLessThan(0.2);
    }

    expect(
      resolveSparkBurst({ sparkCount: 7, sparkRadius: 20, richer: false }),
    ).toEqual({ sparkCount: 7, sparkRadius: 20, angles: null });
  });

});
