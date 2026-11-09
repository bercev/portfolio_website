import { describe, expect, it } from "vitest";

import {
  BUST_BRIGHT_OPACITY,
  BUST_YIELDED_OPACITY,
  bustYieldOpacity,
  bustYieldSamplePoints,
  cssColorAlpha,
  nextBustYielded,
} from "./bust-yield";

describe("bustYieldSamplePoints", () => {
  it("returns a 4x4 grid inset 15% from the rect edges", () => {
    const pts = bustYieldSamplePoints({ left: 100, top: 50, width: 200, height: 200 });
    expect(pts).toHaveLength(16);
    // Corners land at the 15% / 85% fractions.
    expect(pts[0]).toEqual({ x: 130, y: 80 });
    expect(pts[3]).toEqual({ x: 270, y: 80 });
    expect(pts[12]).toEqual({ x: 130, y: 220 });
    expect(pts[15]).toEqual({ x: 270, y: 220 });
    // Inner points sit at the 0.15 + 0.7 * (i / 3) fractions (0.3833 / 0.6167).
    expect(pts[5].x).toBeCloseTo(176.67, 1);
    expect(pts[5].y).toBeCloseTo(126.67, 1);
    expect(pts[10].x).toBeCloseTo(223.33, 1);
    expect(pts[10].y).toBeCloseTo(173.33, 1);
  });

  it("supports a 3x3 grid with a custom inset", () => {
    const pts = bustYieldSamplePoints(
      { left: 0, top: 0, width: 90, height: 90 },
      3,
      0.18,
    );
    expect(pts).toHaveLength(9);
    expect(pts[0].x).toBeCloseTo(16.2);
    expect(pts[0].y).toBeCloseTo(16.2);
    expect(pts[4].x).toBeCloseTo(45);
    expect(pts[4].y).toBeCloseTo(45);
    expect(pts[8].x).toBeCloseTo(73.8);
    expect(pts[8].y).toBeCloseTo(73.8);
  });
});

describe("nextBustYielded", () => {
  it("yields at 3 covered points and restores at 1", () => {
    expect(nextBustYielded(false, 3)).toBe(true);
    expect(nextBustYielded(true, 1)).toBe(false);
    expect(nextBustYielded(false, 0)).toBe(false);
    expect(nextBustYielded(true, 16)).toBe(true);
  });

  it("holds the previous state in the dead band (2 covered)", () => {
    expect(nextBustYielded(false, 2)).toBe(false);
    expect(nextBustYielded(true, 2)).toBe(true);
  });
});

describe("bustYieldOpacity", () => {
  it("returns the bright and yielded opacities", () => {
    expect(bustYieldOpacity(false)).toBe(BUST_BRIGHT_OPACITY);
    expect(bustYieldOpacity(true)).toBe(BUST_YIELDED_OPACITY);
    expect(BUST_BRIGHT_OPACITY).toBe(0.65);
    expect(BUST_YIELDED_OPACITY).toBe(0.12);
  });
});

describe("cssColorAlpha", () => {
  it("reads rgb as opaque and rgba alpha as given", () => {
    expect(cssColorAlpha("rgb(1, 2, 3)")).toBe(1);
    expect(cssColorAlpha("rgba(125, 211, 252, 0.14)")).toBe(0.14);
    expect(cssColorAlpha("rgba(0, 0, 0, 0)")).toBe(0);
  });

  it("returns 0 for transparent and unparsable input", () => {
    expect(cssColorAlpha("transparent")).toBe(0);
    expect(cssColorAlpha("")).toBe(0);
    expect(cssColorAlpha("red")).toBe(0);
    expect(cssColorAlpha("rgba(1, 2, x, 0.5)")).toBe(0);
  });
});
