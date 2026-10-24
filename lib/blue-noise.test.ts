import { describe, expect, it } from "vitest";

import { BLUE_NOISE_128, blueNoiseThreshold } from "./blue-noise";

describe("blue-noise threshold tile", () => {
  it("is a 128x128 tile", () => {
    expect(BLUE_NOISE_128.length).toBe(128 * 128);
  });

  it("has a perfectly flat histogram (each value exactly 64x)", () => {
    // The bake permutes ranks 0..16383 then shifts >> 6, so every byte
    // value 0..255 must occur exactly 64 times — the dissolve sweep then
    // passes exactly 1/16 of pixels per level.
    const hist = new Array(256).fill(0);
    for (const v of BLUE_NOISE_128) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(255);
      hist[v]++;
    }
    for (const c of hist) expect(c).toBe(64);
  });

  it("wraps toroidally in the sampler", () => {
    expect(blueNoiseThreshold(128, 0)).toBe(blueNoiseThreshold(0, 0));
    expect(blueNoiseThreshold(0, 128)).toBe(blueNoiseThreshold(0, 0));
    expect(blueNoiseThreshold(-1, -1)).toBe(blueNoiseThreshold(127, 127));
    expect(blueNoiseThreshold(200, 300)).toBe(blueNoiseThreshold(72, 44));
  });

  it("keeps blue-noise spacing at a coarse threshold (no clumping)", () => {
    // Pixels with value < 16 are the first 1024 placed points (1/16
    // density, mean spacing 4px). Best-candidate placement guarantees a
    // minimum toroidal separation well above white noise's.
    const pts: Array<[number, number]> = [];
    for (let y = 0; y < 128; y++)
      for (let x = 0; x < 128; x++)
        if (BLUE_NOISE_128[y * 128 + x] < 16) pts.push([x, y]);
    expect(pts.length).toBe(1024);
    let minD2 = Infinity;
    for (let i = 0; i < pts.length; i++) {
      for (let j = i + 1; j < pts.length; j++) {
        let dx = Math.abs(pts[i][0] - pts[j][0]);
        if (dx > 64) dx = 128 - dx;
        if (dx * dx >= minD2) continue;
        let dy = Math.abs(pts[i][1] - pts[j][1]);
        if (dy > 64) dy = 128 - dy;
        const d2 = dx * dx + dy * dy;
        if (d2 < minD2) minD2 = d2;
      }
    }
    // >2px separation at 1/16 density (white noise would sit near ~1px).
    expect(Math.sqrt(minD2)).toBeGreaterThan(2);
  });

  it("has no large solid blocks at the 50% threshold", () => {
    // A 2x2 solid block of sub-128 values is a low-frequency clump —
    // blue noise suppresses these (white noise would make ~1024).
    let blocks = 0;
    for (let y = 0; y < 128; y++) {
      for (let x = 0; x < 128; x++) {
        const v = (xx: number, yy: number) =>
          BLUE_NOISE_128[(((y + yy) & 127) << 7) | ((x + xx) & 127)];
        if (v(0, 0) < 128 && v(1, 0) < 128 && v(0, 1) < 128 && v(1, 1) < 128)
          blocks++;
      }
    }
    expect(blocks).toBeLessThan(800);
  });
});
