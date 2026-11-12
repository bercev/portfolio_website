import { describe, expect, it } from "vitest";

import {
  CURTAIN_MAX_INSET_PCT,
  CURTAIN_OPEN_END,
  CURTAIN_PARALLAX_PX,
  caseCurtainClipAt,
  caseCurtainEdgeOpacityAt,
  caseCurtainInsetAt,
  caseCurtainParallaxYAt,
} from "./case-curtain";

describe("caseCurtainInsetAt", () => {
  it("starts fully closed and opens across the first 45% of the journey", () => {
    expect(caseCurtainInsetAt(0)).toBe(CURTAIN_MAX_INSET_PCT);
    expect(caseCurtainInsetAt(CURTAIN_OPEN_END)).toBe(0);
    expect(caseCurtainInsetAt(1)).toBe(0);
  });

  it("opens linearly, so the curtain tracks the scroll exactly", () => {
    expect(caseCurtainInsetAt(0.225)).toBeCloseTo(25, 10);
    expect(caseCurtainInsetAt(0.1125)).toBeCloseTo(37.5, 10);
    expect(caseCurtainInsetAt(0.3375)).toBeCloseTo(12.5, 10);
  });

  it("clamps out-of-range progress", () => {
    expect(caseCurtainInsetAt(-0.5)).toBe(CURTAIN_MAX_INSET_PCT);
    expect(caseCurtainInsetAt(1.5)).toBe(0);
  });
});

describe("caseCurtainClipAt", () => {
  it("opens from the center — top and bottom insets match", () => {
    expect(caseCurtainClipAt(0)).toBe("inset(50% 0% 50% 0%)");
    expect(caseCurtainClipAt(0.225)).toBe("inset(25% 0% 25% 0%)");
    expect(caseCurtainClipAt(1)).toBe("inset(0% 0% 0% 0%)");
  });
});

describe("caseCurtainParallaxYAt", () => {
  it("drifts from +14px at entry to -14px at exit", () => {
    expect(caseCurtainParallaxYAt(0)).toBe(CURTAIN_PARALLAX_PX);
    expect(caseCurtainParallaxYAt(0.5)).toBe(0);
    expect(caseCurtainParallaxYAt(1)).toBe(-CURTAIN_PARALLAX_PX);
  });

  it("stays inside the section gap, so the figure never overlaps its neighbors", () => {
    expect(Math.abs(caseCurtainParallaxYAt(0))).toBeLessThanOrEqual(16);
    expect(Math.abs(caseCurtainParallaxYAt(1))).toBeLessThanOrEqual(16);
  });

  it("clamps out-of-range progress", () => {
    expect(caseCurtainParallaxYAt(-0.5)).toBe(CURTAIN_PARALLAX_PX);
    expect(caseCurtainParallaxYAt(1.5)).toBe(-CURTAIN_PARALLAX_PX);
  });
});

describe("caseCurtainEdgeOpacityAt", () => {
  it("holds full strength while the curtain travels, then fades out as it completes", () => {
    expect(caseCurtainEdgeOpacityAt(0)).toBe(1);
    expect(caseCurtainEdgeOpacityAt(0.3)).toBe(1);
    expect(caseCurtainEdgeOpacityAt(CURTAIN_OPEN_END)).toBe(0);
    expect(caseCurtainEdgeOpacityAt(1)).toBe(0);
  });

  it("fades linearly across the last stretch, so the settled figure is clean", () => {
    expect(caseCurtainEdgeOpacityAt(0.375)).toBeCloseTo(0.5, 10);
  });

  it("clamps out-of-range progress", () => {
    expect(caseCurtainEdgeOpacityAt(-0.5)).toBe(1);
    expect(caseCurtainEdgeOpacityAt(1.5)).toBe(0);
  });
});
