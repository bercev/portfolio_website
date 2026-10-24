import { describe, expect, it } from "vitest";

import {
  BUST_EDGE_THRESHOLD,
  edgeDirection,
  edgeGlyphForGradient,
  glyphForDirection,
  projectedEdgeGlyph,
  sobelGradient,
} from "./bust-edge";

// Grid helper: lum as a flat row-major array.
const grid = (rows: number[][]): number[] => rows.flat();

describe("sobelGradient", () => {
  it("reads a vertical step edge as a pure horizontal gradient", () => {
    // Left half 0, right half 1: the edge column is x=1 (first 1-column).
    const lum = grid([
      [0, 1, 1],
      [0, 1, 1],
      [0, 1, 1],
    ]);
    const { gx, gy } = sobelGradient(lum, 3, 3, 1, 1);
    expect(gx).toBeCloseTo(1, 5);
    expect(gy).toBeCloseTo(0, 5);
  });

  it("reads a horizontal step edge as a pure vertical gradient", () => {
    const lum = grid([
      [0, 0, 0],
      [1, 1, 1],
      [1, 1, 1],
    ]);
    const { gx, gy } = sobelGradient(lum, 3, 3, 1, 1);
    expect(gx).toBeCloseTo(0, 5);
    expect(gy).toBeCloseTo(1, 5);
  });

  it("reads a flat field as zero gradient", () => {
    const lum = grid([
      [0.5, 0.5, 0.5],
      [0.5, 0.5, 0.5],
      [0.5, 0.5, 0.5],
    ]);
    const { gx, gy } = sobelGradient(lum, 3, 3, 1, 1);
    expect(gx).toBe(0);
    expect(gy).toBe(0);
  });

  it("clamps borders instead of zero-padding (silhouette ring kept)", () => {
    const lum = grid([
      [0, 0, 0],
      [0, 1, 1],
      [0, 1, 1],
    ]);
    const { gx } = sobelGradient(lum, 3, 3, 0, 1);
    expect(gx).toBeGreaterThan(0);
    expect(Number.isFinite(gx)).toBe(true);
  });
});

describe("edgeDirection / edgeGlyphForGradient", () => {
  it("maps a vertical edge (gx dominant) to |", () => {
    expect(edgeGlyphForGradient(1, 0)).toBe("|");
    expect(edgeDirection(1, 0)).toEqual({ eu: 0, ev: 1 });
  });

  it("maps a horizontal edge (gy dominant) to -", () => {
    expect(edgeGlyphForGradient(0, 1)).toBe("-");
    expect(edgeDirection(0, 1)).toEqual({ eu: -1, ev: 0 });
  });

  it("maps a gradient (1, 1) edge to /", () => {
    // Direction (-1, 1)/√2 in screen y-down coordinates: product
    // eu*ev < 0, so glyphForDirection returns `/`. This pins the
    // screen-space sign rule (math y-up intuition flips here).
    expect(edgeGlyphForGradient(1, 1)).toBe("/");
  });

  it("maps an up-right diagonal edge to the other diagonal", () => {
    // Gradient (1, -1): direction (1, 1)/√2, product > 0 => `\`.
    expect(edgeGlyphForGradient(1, -1)).toBe("\\");
  });

  it("returns null below threshold and for degenerate input", () => {
    expect(edgeGlyphForGradient(0.1, 0)).toBeNull();
    expect(edgeGlyphForGradient(0, 0)).toBeNull();
    expect(edgeGlyphForGradient(NaN, 0)).toBeNull();
    expect(edgeGlyphForGradient(1, NaN)).toBeNull();
    expect(edgeDirection(BUST_EDGE_THRESHOLD, 0)).not.toBeNull();
    expect(edgeDirection(BUST_EDGE_THRESHOLD - 0.01, 0)).toBeNull();
  });
});

describe("glyphForDirection dominance", () => {
  it("keeps near-axis directions axis-aligned (2:1 ratio)", () => {
    expect(glyphForDirection(1, 0.4)).toBe("-");
    expect(glyphForDirection(0.4, 1)).toBe("|");
    // Exactly at the boundary the axis wins (>=).
    expect(glyphForDirection(1, 0.5)).toBe("-");
    expect(glyphForDirection(0.5, 1)).toBe("|");
  });
});

describe("projectedEdgeGlyph", () => {
  it("is the source glyph at front view (cos = 1)", () => {
    expect(projectedEdgeGlyph(0, 1, 1, 1)).toBe("|");
    expect(projectedEdgeGlyph(-1, 0, 1, 1)).toBe("-");
  });

  it("leans a vertical contour into a diagonal as yaw compresses x", () => {
    // Source vertical edge (eu=0, ev=1) at 57° yaw: cos ≈ 0.54.
    // Projected direction is still vertical (eu stays 0), so it
    // stays `|`. The interesting case is a source diagonal: its
    // horizontal component shrinks, so a near-diagonal can become
    // vertical. Here a 45° source diagonal (0.707, 0.707) at cosYaw
    // 0.2 projects to (0.14, 0.707) — vertical-dominant => `|`.
    expect(projectedEdgeGlyph(0.707, 0.707, 0.2, 1)).toBe("|");
    // At front view the same direction is diagonal.
    expect(projectedEdgeGlyph(0.707, 0.707, 1, 1)).toBe("\\");
  });

  it("collapses to an axis glyph at a 90° turn (cos = 0)", () => {
    expect(projectedEdgeGlyph(0.707, 0.707, 0, 1)).toBe("|");
    expect(projectedEdgeGlyph(0.707, 0.707, 1, 0)).toBe("-");
  });
});
