import { describe, expect, it } from "vitest";

import {
  METABALL_REST_T,
  metaballMinGap,
  metaballPositions,
} from "./hero-metaballs";

const DESKTOP: [number, number] = [1088, 384];
const MOBILE: [number, number] = [358, 208];

describe("hero metaballs", () => {
  it("is deterministic: same time gives the same blobs", () => {
    expect(metaballPositions(7.3, ...DESKTOP)).toEqual(
      metaballPositions(7.3, ...DESKTOP),
    );
  });

  it("keeps all three blobs inside the band at every sampled time", () => {
    for (const [w, h] of [DESKTOP, MOBILE]) {
      for (let t = 0; t <= 30; t += 0.25) {
        for (const b of metaballPositions(t, w, h)) {
          expect(b.x).toBeGreaterThanOrEqual(-0.05 * w);
          expect(b.x).toBeLessThanOrEqual(1.05 * w);
          expect(b.y).toBeGreaterThanOrEqual(0);
          expect(b.y).toBeLessThanOrEqual(h);
          expect(b.r).toBeGreaterThan(0);
        }
      }
    }
  });

  it("merges and splits: the min gap goes negative and positive", () => {
    for (const [w, h] of [DESKTOP, MOBILE]) {
      let min = Infinity;
      let max = -Infinity;
      for (let t = 0; t <= 30; t += 0.1) {
        const gap = metaballMinGap(t, w, h);
        if (gap < min) min = gap;
        if (gap > max) max = gap;
      }
      expect(min).toBeLessThan(0);
      expect(max).toBeGreaterThan(0);
    }
  });

  it("straddles a merge between the 6s and 12s frames", () => {
    // Post-boot pair window: split at 6s, merged by 12s, both widths.
    for (const [w, h] of [DESKTOP, MOBILE]) {
      expect(metaballMinGap(6, w, h)).toBeGreaterThan(0);
      expect(metaballMinGap(12, w, h)).toBeLessThan(0);
    }
  });

  it("moves visibly in a 3s pair: blob B travels at both widths", () => {
    for (const [w, h] of [DESKTOP, MOBILE]) {
      const a = metaballPositions(6, w, h)[1];
      const b = metaballPositions(9, w, h)[1];
      expect(Math.hypot(b.x - a.x, b.y - a.y)).toBeGreaterThan(0.1 * w);
    }
  });

  it("rests split: the reduced-motion pose shows three separate blobs", () => {
    for (const [w, h] of [DESKTOP, MOBILE]) {
      expect(metaballMinGap(METABALL_REST_T, w, h)).toBeGreaterThan(0);
    }
  });

  it("radii scale with box width", () => {
    const d = metaballPositions(6, ...DESKTOP);
    const m = metaballPositions(6, ...MOBILE);
    for (let i = 0; i < 3; i++) {
      expect(d[i].r / m[i].r).toBeCloseTo(DESKTOP[0] / MOBILE[0], 5);
    }
  });
});
