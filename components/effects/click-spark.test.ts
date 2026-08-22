import { describe, expect, it } from "vitest";

import {
  CLICK_SPARK_DEFAULTS,
  calculateCanvasSize,
  calculateSparkSegment,
  getClickSparkColor,
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

  it("uses black sparks in light mode and white sparks in dark mode", () => {
    expect(getClickSparkColor("#f43f5e")).toBe("#f43f5e");
    expect(getClickSparkColor(undefined)).toBe("#000000");
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
});
