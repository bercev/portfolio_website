import { describe, expect, it } from "vitest";

import {
  SPREAD_MEASURE_DELAY_S,
  SPREAD_MEASURE_DRAW_MS,
  SPREAD_MEASURE_LABEL_DELAY_S,
  notFoundTearPoints,
  spreadMeasureDrawDelay,
  spreadMeasureLabel,
} from "./not-found-spread";

describe("spreadMeasureLabel", () => {
  it("measures the ghost figure in its own native units", () => {
    expect(spreadMeasureLabel()).toBe("640 × 280");
  });
});

describe("spreadMeasureDrawDelay", () => {
  it("draws the line first, then the label with the end ticks", () => {
    expect(spreadMeasureDrawDelay("line")).toBe(SPREAD_MEASURE_DELAY_S);
    expect(spreadMeasureDrawDelay("label")).toBe(
      SPREAD_MEASURE_LABEL_DELAY_S,
    );
    expect(SPREAD_MEASURE_LABEL_DELAY_S).toBeGreaterThan(
      SPREAD_MEASURE_DELAY_S,
    );
  });

  it("keeps the draw under a second", () => {
    expect(SPREAD_MEASURE_DRAW_MS).toBeLessThanOrEqual(1000);
  });
});

describe("notFoundTearPoints", () => {
  it("meets the sheet's side borders at the bottom corners", () => {
    const points = notFoundTearPoints().split(" ");
    expect(points[0]).toBe("0,10");
    expect(points[points.length - 1]).toBe("1000,10");
  });

  it("alternates teeth between 2 and 8px with rising x", () => {
    const points = notFoundTearPoints()
      .split(" ")
      .map((p) => p.split(",").map(Number));
    expect(points.length).toBe(41);
    let prevX = -1;
    for (const [x, y] of points) {
      expect(x).toBeGreaterThan(prevX);
      expect(y).toBeGreaterThanOrEqual(2);
      expect(y).toBeLessThanOrEqual(10);
      prevX = x;
    }
    const teeth = points.slice(1, -1).map(([, y]) => y);
    expect(teeth[0]).toBe(2);
    expect(teeth[1]).toBe(8);
    expect(new Set(teeth).size).toBe(2);
  });
});
