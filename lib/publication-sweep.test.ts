import { describe, expect, it } from "vitest";

import {
  PUB_SWEEP_BAND_WIDTH_PX,
  PUB_SWEEP_END_OFFSET_PX,
  PUB_SWEEP_FADE_START,
  PUB_SWEEP_MS,
  PUB_SWEEP_OPACITY,
  PUB_SWEEP_START_PX,
  pubSweepBandLeft,
  pubSweepBandOpacity,
} from "./publication-sweep";

describe("sweep timing", () => {
  it("crosses the row in 650ms, the preview-sheen duration", () => {
    expect(PUB_SWEEP_MS).toBe(650);
  });
});

describe("pubSweepBandLeft", () => {
  it("starts parked off the left edge and ends past the right edge", () => {
    expect(pubSweepBandLeft(0, 1200)).toBe(`${PUB_SWEEP_START_PX}px`);
    expect(pubSweepBandLeft(1, 1200)).toBe(
      `${1200 + PUB_SWEEP_END_OFFSET_PX}px`,
    );
  });

  it("is mid-row at progress 0.5", () => {
    // -320 + 0.5 * (1200 + 320 + 240) = 560.
    expect(pubSweepBandLeft(0.5, 1200)).toBe("560px");
  });

  it("stays off the left edge at rest even with the skew shift", () => {
    // Rightmost point at rest is the top-right corner: start + width.
    expect(PUB_SWEEP_START_PX + PUB_SWEEP_BAND_WIDTH_PX).toBeLessThan(0);
  });

  it("clamps out-of-range progress", () => {
    expect(pubSweepBandLeft(-1, 1200)).toBe(pubSweepBandLeft(0, 1200));
    expect(pubSweepBandLeft(2, 1200)).toBe(pubSweepBandLeft(1, 1200));
    expect(pubSweepBandLeft(Number.NaN, 1200)).toBe(
      pubSweepBandLeft(0, 1200),
    );
  });

  it("travels monotonically", () => {
    const lefts = [0, 0.25, 0.5, 0.75, 1].map((p) =>
      Number.parseFloat(pubSweepBandLeft(p, 1200)),
    );
    for (let i = 1; i < lefts.length; i++) {
      expect(lefts[i]).toBeGreaterThan(lefts[i - 1]);
    }
  });
});

describe("pubSweepBandOpacity", () => {
  it("holds full strength until the fade start, then fades to zero", () => {
    expect(pubSweepBandOpacity(0)).toBe(PUB_SWEEP_OPACITY);
    expect(pubSweepBandOpacity(PUB_SWEEP_FADE_START)).toBe(PUB_SWEEP_OPACITY);
    expect(pubSweepBandOpacity(1)).toBe(0);
  });

  it("is halfway faded at the midpoint of the fade", () => {
    expect(pubSweepBandOpacity(0.85)).toBeCloseTo(PUB_SWEEP_OPACITY / 2, 10);
  });

  it("clamps out-of-range progress", () => {
    expect(pubSweepBandOpacity(-1)).toBe(pubSweepBandOpacity(0));
    expect(pubSweepBandOpacity(2)).toBe(pubSweepBandOpacity(1));
    expect(pubSweepBandOpacity(Number.NaN)).toBe(pubSweepBandOpacity(0));
  });
});
